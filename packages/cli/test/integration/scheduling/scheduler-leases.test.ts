import { testDb } from '@n8n/backend-test-utils';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Lease, LeaseKind, LeaseSpec } from '@n8n/leases';
import { LeaseEndedError, LeaseService } from '@n8n/leases';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { HeldTaskProvisioner } from '@/scheduling/held-tasks/held-task-provisioner';
import { DurableSchedulerLeaseProvider } from '@/scheduling/leases/durable-scheduler-lease-provider';

import { retryUntil } from '../shared/retry-until';
import { buildHeldTaskMain } from './shared/held-task-main';

const KIND = 'test-socket';
const LEASE_SECONDS = 6;

type Hold = { host: string; key: string; data: unknown; fencingToken: number; ended?: unknown };

describe('leases on the durable scheduler across two mains', () => {
	let desired: LeaseSpec[];
	let holds: Hold[];
	const mains: Array<Scheduler & SchedulerPasses> = [];

	const kindFor = (host: string): LeaseKind => ({
		name: KIND,
		options: { leaseSeconds: LEASE_SECONDS, startTimeoutSeconds: 10, maxFailedStarts: 3 },
		listDesired: async (keys) =>
			desired.filter((spec) => keys === undefined || keys.includes(spec.key)),
		handler: {
			hold: async (lease: Lease) => {
				const hold: Hold = {
					host,
					key: lease.key,
					data: lease.data,
					fencingToken: lease.fencingToken,
				};
				holds.push(hold);
				await lease.ready();
				await new Promise<void>((resolve) => {
					if (lease.signal.aborted) resolve();
					else lease.signal.addEventListener('abort', () => resolve(), { once: true });
				});
				hold.ended = lease.signal.reason;
			},
		},
	});

	const buildMain = (host: string) => {
		const { scheduler, partition } = buildHeldTaskMain(host);
		const leases = new LeaseService(
			new DurableSchedulerLeaseProvider(
				{
					registerHoldTaskHandler: (taskType, handler) =>
						scheduler.registerTaskHandler(taskType, handler),
					registerJobOwner: () => {},
				},
				Container.get(HeldTaskProvisioner),
			),
		);
		leases.registerKind(kindFor(host));
		mains.push(scheduler);
		return { scheduler, leases, partition };
	};

	const live = () => holds.filter((hold) => hold.ended === undefined);

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		desired = [];
		holds = [];
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterEach(async () => {
		await Promise.all(mains.splice(0).map(async (main) => await main.stop()));
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('holds each desired lease on one main, fenced by the task epoch', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		desired = [
			{ key: 'wf-1:node-1', data: { topic: 'orders' } },
			{ key: 'wf-2:node-1', data: { topic: 'refunds' } },
		];

		await a.leases.syncAll();
		await Promise.all([a.scheduler.execute(), b.scheduler.execute()]);

		await retryUntil(async () => expect(live()).toHaveLength(2));
		expect(new Set(live().map((hold) => hold.key))).toEqual(
			new Set(['wf-1:node-1', 'wf-2:node-1']),
		);
		const tasks = await Container.get(ScheduledTaskRepository).findBy({ mode: 'hold' });
		for (const hold of live()) {
			const task = tasks.find((t) => t.payload.key === hold.key);
			expect(hold.fencingToken).toBe(task?.leaseEpoch);
			expect(task?.claimedBy).toBe(hold.host);
		}
	}, 30_000);

	it('ends a lease that is no longer desired and removes its job', async () => {
		const a = buildMain('main-a');
		desired = [{ key: 'wf-1:node-1', data: {} }];
		await a.leases.syncAll();
		await a.scheduler.execute();
		await retryUntil(async () => expect(live()).toHaveLength(1));

		desired = [];
		await a.leases.changed(KIND, ['wf-1:node-1']);

		await retryUntil(async () => expect(live()).toHaveLength(0), { timeoutMs: 10_000 });
		expect(holds[0].ended).toEqual(new LeaseEndedError('lost'));
		expect(await Container.get(ScheduledJobRepository).count()).toBe(0);
	}, 30_000);

	it('hands a lease whose data changed to a new holder with a higher fencing token', async () => {
		const a = buildMain('main-a');
		desired = [{ key: 'wf-1:node-1', data: { topic: 'orders' } }];
		await a.leases.syncAll();
		await a.scheduler.execute();
		await retryUntil(async () => expect(live()).toHaveLength(1));

		desired = [{ key: 'wf-1:node-1', data: { topic: 'orders-v2' } }];
		await a.leases.changed(KIND, ['wf-1:node-1']);
		await retryUntil(
			async () => {
				await a.scheduler.execute();
				expect(live().map((hold) => hold.data)).toEqual([{ topic: 'orders-v2' }]);
			},
			{ timeoutMs: 15_000 },
		);
		expect(holds[0].ended).toEqual(new LeaseEndedError('lost'));
	}, 30_000);

	it('leaves an unchanged lease with its holder', async () => {
		const a = buildMain('main-a');
		desired = [{ key: 'wf-1:node-1', data: { topic: 'orders' } }];
		await a.leases.syncAll();
		await a.scheduler.execute();
		await retryUntil(async () => expect(live()).toHaveLength(1));

		await a.leases.syncAll();
		await a.scheduler.execute();

		expect(holds).toHaveLength(1);
		expect(live()).toHaveLength(1);
	}, 30_000);

	it('moves a lease to the other main when its holder crashes', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		desired = [{ key: 'wf-1:node-1', data: {} }];
		await a.leases.syncAll();
		await a.scheduler.execute();
		await retryUntil(async () => expect(live().map((hold) => hold.host)).toEqual(['main-a']));
		const first = live()[0];

		a.partition.partitioned = true;
		await retryUntil(
			async () => {
				await b.scheduler.execute();
				expect(live().map((hold) => hold.host)).toEqual(['main-b']);
			},
			{ intervalMs: 250, timeoutMs: (LEASE_SECONDS + 10) * 1000 },
		);

		expect(first.ended).toEqual(new LeaseEndedError('lost'));
		expect(live()[0].fencingToken).toBeGreaterThan(first.fencingToken);
	}, 30_000);

	it('ends the lease with shutdown on a graceful stop and hands it over', async () => {
		const a = buildMain('main-a');
		const b = buildMain('main-b');
		desired = [{ key: 'wf-1:node-1', data: {} }];
		await a.leases.syncAll();
		await a.scheduler.execute();
		await retryUntil(async () => expect(live()).toHaveLength(1));

		await a.scheduler.stop();
		await b.scheduler.execute();

		await retryUntil(async () => expect(live().map((hold) => hold.host)).toEqual(['main-b']));
		expect(holds[0].ended).toEqual(new LeaseEndedError('shutdown'));
	}, 30_000);
});
