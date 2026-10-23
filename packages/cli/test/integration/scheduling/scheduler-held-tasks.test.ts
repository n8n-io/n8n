import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type {
	ClaimedTask,
	HoldReporter,
	HoldRun,
	HoldTaskHandler,
	Scheduler,
	SchedulerPasses,
	SchedulerTaskStore,
} from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import { HeldTaskProvisioner } from '@/scheduling/held-tasks/held-task-provisioner';

import { retryUntil } from '../shared/retry-until';

const TASK_TYPE = 'integration-held-task';
const LEASE_SECONDS = 6;

type ArmEvent = { kind: 'arm' | 'disarm'; host: string; taskId: string; epoch: number; at: number };

class RecordingHolder implements HoldTaskHandler {
	readonly mode = 'hold';

	readonly armed = new Map<string, number>();

	constructor(
		private readonly host: string,
		private readonly events: ArmEvent[],
	) {}

	async hold(task: ClaimedTask, holder: HoldReporter, run: HoldRun): Promise<void> {
		this.armed.set(task.id, task.leaseEpoch);
		this.events.push({
			kind: 'arm',
			host: this.host,
			taskId: task.id,
			epoch: task.leaseEpoch,
			at: Date.now(),
		});
		await holder.ready();
		if (!run.signal.aborted) {
			await new Promise<void>((resolve) =>
				run.signal.addEventListener('abort', () => resolve(), { once: true }),
			);
		}
		this.armed.delete(task.id);
		this.events.push({
			kind: 'disarm',
			host: this.host,
			taskId: task.id,
			epoch: task.leaseEpoch,
			at: Date.now(),
		});
	}
}

function partitionable(store: ScheduledTaskRepository) {
	const state = { partitioned: false };
	const proxy = new Proxy(store, {
		get(target, property, receiver) {
			const value: unknown = Reflect.get(target, property, receiver);
			if (typeof value !== 'function') return value;
			return async (...args: unknown[]) => {
				if (state.partitioned) throw new Error('partitioned');
				return await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
			};
		},
	});
	return { store: proxy as unknown as SchedulerTaskStore, state };
}

describe('held tasks across two mains over one database', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let provisioner: HeldTaskProvisioner;
	let events: ArmEvent[];
	const mains: Array<Scheduler & SchedulerPasses> = [];

	const buildMain = (hostId: string) => {
		const { store, state } = partitionable(taskRepo);
		const holder = new RecordingHolder(hostId, events);
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: store,
			executor: {
				leaseSeconds: 30,
				lookaheadSeconds: 5,
				batchSize: 100,
				hold: { renewal: 'per-row', shutdownGraceMs: 2_000 },
			},
		});
		scheduler.registerTaskHandler(TASK_TYPE, holder);
		mains.push(scheduler);
		return { scheduler, holder, partition: state };
	};

	const provision = async (count: number) =>
		await provisioner.provision(
			Array.from({ length: count }, (_, index) => ({
				name: `held-${index}`,
				owner: { ownerType: 'held-test', ownerId: `held-${index}`, ownerMemberId: null },
				taskType: TASK_TYPE,
				payload: {},
				timeoutSeconds: 10,
				maxAttempts: 3,
				leaseSeconds: LEASE_SECONDS,
			})),
		);

	const heldBy = async (host: string) =>
		await taskRepo
			.createQueryBuilder('t')
			.where('t.claimedBy = :host', { host })
			.andWhere('t.heldSince IS NOT NULL')
			.getCount();

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		provisioner = Container.get(HeldTaskProvisioner);
	});

	beforeEach(async () => {
		events = [];
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterEach(async () => {
		await Promise.all(mains.splice(0).map(async (main) => await main.stop()));
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('gives each held task at most one holder while both mains claim', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		await provision(6);

		for (let round = 0; round < 5; round++) {
			await Promise.all([a.scheduler.execute(), b.scheduler.execute()]);
		}

		await retryUntil(async () => {
			expect((await heldBy('main-a')) + (await heldBy('main-b'))).toBe(6);
		});
		const armedA = [...a.holder.armed.keys()];
		const armedB = [...b.holder.armed.keys()];
		expect(armedA.filter((id) => armedB.includes(id))).toEqual([]);
		expect(armedA.length + armedB.length).toBe(6);

		const tasks = await taskRepo.find();
		expect(tasks.every((task) => task.mode === 'hold' && task.attempts === 0)).toBe(true);
	}, 30_000);

	it('hands a held task to another main after the holder crashes', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		await provision(1);
		await a.scheduler.execute();
		await retryUntil(async () => expect(await heldBy('main-a')).toBe(1));
		const [before] = await taskRepo.find();

		a.partition.partitioned = true;
		const crashedAt = Date.now();
		let claimedAt = 0;
		await retryUntil(
			async () => {
				const claimed = await b.scheduler.execute();
				if (claimed.length > 0 && claimedAt === 0) claimedAt = Date.now();
				expect(await heldBy('main-b')).toBe(1);
			},
			{ intervalMs: 250, timeoutMs: (LEASE_SECONDS + 10) * 1000 },
		);

		const failoverMs = claimedAt - crashedAt;
		console.log(`held-task crash failover: ${failoverMs} ms at lease ${LEASE_SECONDS}s`);
		expect(failoverMs).toBeLessThanOrEqual((LEASE_SECONDS + 2) * 1000);

		const disarmA = events.find((e) => e.kind === 'disarm' && e.host === 'main-a');
		const armB = events.find((e) => e.kind === 'arm' && e.host === 'main-b');
		expect(disarmA).toBeDefined();
		expect(armB).toBeDefined();
		expect(disarmA!.at).toBeLessThanOrEqual(armB!.at);

		const [after] = await taskRepo.find();
		expect(after.leaseEpoch).toBeGreaterThan(before.leaseEpoch);
		expect(after.attempts).toBe(0);
	}, 30_000);

	it('hands a held task over on graceful shutdown', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		await provision(1);
		await a.scheduler.execute();
		await retryUntil(async () => expect(await heldBy('main-a')).toBe(1));

		const stoppedAt = Date.now();
		await a.scheduler.stop();
		const [released] = await taskRepo.find();
		expect(released.status).toBe('pending');
		expect(released.attempts).toBe(0);

		await b.scheduler.execute();
		await retryUntil(async () => expect(await heldBy('main-b')).toBe(1));
		const handOverMs = Date.now() - stoppedAt;
		console.log(`held-task graceful hand-over: ${handOverMs} ms excluding the claim tick`);
		expect(events.filter((e) => e.host === 'main-a').map((e) => e.kind)).toEqual(['arm', 'disarm']);
	}, 30_000);

	it('stops the holder when its job is deprovisioned', async () => {
		const a = buildMain('main-a');
		await provision(1);
		await a.scheduler.execute();
		await retryUntil(async () => expect(a.holder.armed.size).toBe(1));

		await provisioner.deprovision({
			ownerType: 'held-test',
			ownerId: 'held-0',
			ownerMemberId: null,
		});

		await retryUntil(async () => expect(a.holder.armed.size).toBe(0), { timeoutMs: 10_000 });
		expect(await taskRepo.count()).toBe(0);
	}, 30_000);

	it('rejects every write of a stale holder after another main claims the task', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		await provision(1);
		await a.scheduler.execute();
		await retryUntil(async () => expect(await heldBy('main-a')).toBe(1));
		const [held] = await taskRepo.find();
		const staleClaim = { host: 'main-a', id: held.id, claimedEpoch: held.leaseEpoch };

		a.partition.partitioned = true;
		await retryUntil(
			async () => {
				await b.scheduler.execute();
				expect(await heldBy('main-b')).toBe(1);
			},
			{ intervalMs: 250, timeoutMs: (LEASE_SECONDS + 10) * 1000 },
		);

		expect(await taskRepo.renewLease(staleClaim, 60_000)).toBe(false);
		expect(await taskRepo.markHeld(staleClaim)).toBe(0);
		expect(await taskRepo.releaseHeld(staleClaim, 0, null)).toBe(0);
		expect(await taskRepo.releaseClaim(staleClaim)).toBe(0);
		expect([
			...(await taskRepo.renewLeases('main-a', [{ ...staleClaim, expiresInMs: 60_000 }])),
		]).toEqual([]);

		const [after] = await taskRepo.find();
		expect(after.claimedBy).toBe('main-b');
		expect(after.status).toBe('running');
	}, 30_000);

	it('counts no attempt when the reaper recovers an expired held task', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		await provision(1);
		await a.scheduler.execute();
		await retryUntil(async () => expect(await heldBy('main-a')).toBe(1));

		a.partition.partitioned = true;
		await retryUntil(
			async () => {
				const result = await b.scheduler.reap();
				expect(result.reclaimed).toBe(1);
			},
			{ intervalMs: 250, timeoutMs: (LEASE_SECONDS + 10) * 1000 },
		);
		const [reclaimed] = await taskRepo.find();
		expect(reclaimed.status).toBe('pending');
		expect(reclaimed.attempts).toBe(0);
		expect(reclaimed.heldSince).toBeNull();
	}, 30_000);
});
