import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type {
	ClaimedTask,
	HoldReporter,
	HoldRun,
	HoldTaskHandler,
	Scheduler,
	SchedulerPasses,
} from '@n8n/scheduler';

import { HeldTaskProvisioner } from '@/scheduling/held-tasks/held-task-provisioner';

import { retryUntil } from '../shared/retry-until';
import { buildHeldTaskMain } from './shared/held-task-main';

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

function overlappingHolds(events: ArmEvent[]): string[] {
	const holders = new Map<string, Set<string>>();
	const overlaps: string[] = [];
	for (const event of [...events].sort((a, b) => a.at - b.at)) {
		const hosts = holders.get(event.taskId) ?? new Set<string>();
		if (event.kind === 'arm') {
			if (hosts.size > 0) overlaps.push(`${event.taskId}@${event.host}`);
			hosts.add(event.host);
		} else {
			hosts.delete(event.host);
		}
		holders.set(event.taskId, hosts);
	}
	return overlaps;
}

let jobRepo: ScheduledJobRepository;
let taskRepo: ScheduledTaskRepository;
let provisioner: HeldTaskProvisioner;

beforeAll(async () => {
	await testDb.init();
	jobRepo = Container.get(ScheduledJobRepository);
	taskRepo = Container.get(ScheduledTaskRepository);
	provisioner = Container.get(HeldTaskProvisioner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('held tasks across two mains over one database', () => {
	let events: ArmEvent[];
	const mains: Array<Scheduler & SchedulerPasses> = [];

	const buildMain = (hostId: string) => {
		const { scheduler, partition } = buildHeldTaskMain(hostId);
		const holder = new RecordingHolder(hostId, events);
		scheduler.registerTaskHandler(TASK_TYPE, holder);
		mains.push(scheduler);
		return { scheduler, holder, partition };
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

	beforeEach(async () => {
		events = [];
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterEach(async () => {
		await Promise.all(mains.splice(0).map(async (main) => await main.stop()));
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
		expect(overlappingHolds(events)).toEqual([]);

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

describe('held task repository writes', () => {
	const owner = (ownerId: string) => ({ ownerType: 'held-test', ownerId, ownerMemberId: null });

	const provisionOne = async (ownerId: string, leaseSeconds: number | null = 7) => {
		const [jobId] = await provisioner.provision([
			{
				name: `held-${ownerId}`,
				owner: owner(ownerId),
				taskType: TASK_TYPE,
				payload: { ownerId },
				timeoutSeconds: 11,
				maxAttempts: 4,
				leaseSeconds,
			},
		]);
		return jobId;
	};

	const claim = async (host = 'main-a') =>
		await taskRepo.claimDueTasks({
			host,
			taskTypes: [TASK_TYPE],
			lookaheadMs: 0,
			leaseMs: 30_000,
			batchSize: 100,
			takeExpiredHeld: true,
		});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	it('seeds one held task per hold job, copying the run options', async () => {
		const jobId = await provisionOne('a');
		await jobRepo.seedHeldTasks(Container.get(DataSource).manager, [jobId]);

		const tasks = await taskRepo.findBy({ jobId });
		expect(tasks).toHaveLength(1);
		expect(tasks[0]).toMatchObject({
			mode: 'hold',
			status: 'pending',
			leaseSeconds: 7,
			timeoutSeconds: 11,
			maxAttempts: 4,
			payload: { ownerId: 'a' },
		});
	});

	it('does not seed a task for a quarantined hold job', async () => {
		const jobId = await provisionOne('a');
		await taskRepo.delete({ jobId });
		await jobRepo.update({ id: jobId }, { orphanedAt: new Date() });

		await jobRepo.seedHeldTasks(Container.get(DataSource).manager, [jobId]);

		expect(await taskRepo.countBy({ jobId })).toBe(0);
	});

	it('re-arms a failed held task of a live owner and seeds a missing one', async () => {
		const failedJob = await provisionOne('a');
		const prunedJob = await provisionOne('b');
		const otherJob = await provisionOne('c');
		await taskRepo.update(
			{ jobId: failedJob },
			{ status: 'failed', attempts: 4, finishedAt: new Date() },
		);
		await taskRepo.update(
			{ jobId: otherJob },
			{ status: 'failed', attempts: 4, finishedAt: new Date() },
		);
		await taskRepo.delete({ jobId: prunedJob });

		expect(await jobRepo.rearmHeldTasks('held-test', ['a', 'b'])).toBe(1);

		expect(await taskRepo.findOneByOrFail({ jobId: failedJob })).toMatchObject({
			status: 'pending',
			attempts: 0,
			finishedAt: null,
			heldSince: null,
		});
		expect(await taskRepo.findOneByOrFail({ jobId: prunedJob })).toMatchObject({
			status: 'pending',
			mode: 'hold',
		});
		expect(await taskRepo.findOneByOrFail({ jobId: otherJob })).toMatchObject({
			status: 'failed',
		});
	});

	it('claims an expired held task directly and leaves held tasks that are live or never ready', async () => {
		const expiredReady = await provisionOne('a');
		const liveReady = await provisionOne('b');
		const expiredNotReady = await provisionOne('c');
		const past = new Date(Date.now() - 60_000);
		const later = new Date(Date.now() + 60_000);
		const running = { status: 'running' as const, claimedBy: 'main-gone', leaseEpoch: 3 };
		await taskRepo.update(
			{ jobId: expiredReady },
			{ ...running, heldSince: past, leaseExpiresAt: past, startedAt: past },
		);
		await taskRepo.update(
			{ jobId: liveReady },
			{ ...running, heldSince: past, leaseExpiresAt: later, startedAt: past },
		);
		await taskRepo.update(
			{ jobId: expiredNotReady },
			{ ...running, heldSince: null, leaseExpiresAt: past, startedAt: past },
		);

		const claimed = await claim();

		expect(claimed.map((task) => task.jobId)).toEqual([expiredReady]);
		const taken = await taskRepo.findOneByOrFail({ jobId: expiredReady });
		expect(taken).toMatchObject({
			claimedBy: 'main-a',
			leaseEpoch: 4,
			heldSince: null,
			startedAt: null,
			attempts: 0,
		});
		const leaseMs = (taken.leaseExpiresAt?.getTime() ?? 0) - Date.now();
		expect(leaseMs).toBeGreaterThan(5_000);
		expect(leaseMs).toBeLessThanOrEqual(8_000);
	});

	it('does not claim an expired running task of a once job', async () => {
		const jobId = await provisionOne('a');
		const past = new Date(Date.now() - 60_000);
		await taskRepo.update(
			{ jobId },
			{
				mode: 'once',
				status: 'running',
				claimedBy: 'main-gone',
				leaseEpoch: 1,
				heldSince: past,
				leaseExpiresAt: past,
			},
		);

		expect(await claim()).toEqual([]);
	});

	it('withdraws a running held task when its owner is quarantined', async () => {
		const jobId = await provisionOne('a');
		await jobRepo.update({ id: jobId }, { createdAt: new Date(Date.now() - 3_600_000) });
		const [task] = await claim();
		await taskRepo.markHeld({ host: 'main-a', id: task.id, claimedEpoch: task.leaseEpoch });

		await jobRepo.quarantineByOwnerIds('held-test', ['a'], new Date(), new Date());

		expect(await taskRepo.countBy({ jobId })).toBe(0);
		expect(
			await taskRepo.renewLease(
				{ host: 'main-a', id: task.id, claimedEpoch: task.leaseEpoch },
				30_000,
			),
		).toBe(false);
	});

	it('gives a hold job its task back when its quarantine is lifted', async () => {
		const jobId = await provisionOne('a');
		await taskRepo.delete({ jobId });
		await jobRepo.update({ id: jobId }, { orphanedAt: new Date() });

		expect(await jobRepo.liftQuarantine(jobId, null)).toBe(1);

		expect(await taskRepo.findOneByOrFail({ jobId })).toMatchObject({
			status: 'pending',
			mode: 'hold',
		});
	});

	it('renews only the leases of claims that still match their epoch', async () => {
		const first = await provisionOne('a');
		const second = await provisionOne('b');
		const claimed = await claim();
		const byJob = new Map(claimed.map((task) => [task.jobId, task]));
		const current = byJob.get(first)!;
		const stale = byJob.get(second)!;
		await taskRepo.update({ id: stale.id }, { leaseEpoch: stale.leaseEpoch + 1 });

		const renewed = await taskRepo.renewLeases('main-a', [
			{ id: current.id, claimedEpoch: current.leaseEpoch, expiresInMs: 30_000 },
			{ id: stale.id, claimedEpoch: stale.leaseEpoch, expiresInMs: 30_000 },
		]);

		expect([...renewed]).toEqual([current.id]);
	});
});
