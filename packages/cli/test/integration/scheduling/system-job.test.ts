import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

/**
 * A job with no owning workflow (`workflowId`/`nodeId` NULL), the shape system
 * tasks use: identified by a well-known unique `name`, matched to its handler
 * by `taskType` alone. Pins the engine's indifference to the NULL scope across
 * materialize -> claim -> fire -> retention, and the misfire behaviour that
 * changes without an owner. The mechanics themselves are covered by the
 * sibling suites; this one is the named contract A6/A7 build on.
 */
describe('system jobs (no owning workflow)', () => {
	const TASK_TYPE = 'system:integration-test';
	const JOB_NAME = 'system:integration-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;
	const executed: ClaimedTask[] = [];

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		scheduler = createScheduler({
			hostId: 'main-system-job-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task, report) => {
				executed.push(task);
				return report.dispatched();
			},
		});
	});

	beforeEach(async () => {
		executed.length = 0;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	const createSystemJob = async (overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name: JOB_NAME,
				workflowId: null,
				nodeId: null,
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(Date.now() - 1000),
				maxAttempts: 3,
				...overrides,
			}),
		);

	const waitFor = async (predicate: () => Promise<boolean>, timeoutMs = 10_000) => {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			if (await predicate()) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		throw new Error('condition not met in time');
	};

	it('runs end to end and stays workflow-less: materialized, fired, pruned', async () => {
		const job = await createSystemJob({ payload: { origin: 'system' } });

		const summary = await scheduler.materialize();
		expect(summary).toMatchObject({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });

		const claimed = await scheduler.execute();
		expect(claimed).toHaveLength(1);
		expect(claimed[0].taskType).toBe(TASK_TYPE);

		await waitFor(
			async () => (await taskRepo.findOneByOrFail({ jobId: job.id })).status === 'succeeded',
		);
		expect(executed).toHaveLength(1);
		expect(executed[0].payload).toEqual({ origin: 'system' });

		// The system-job access path is the well-known name; the whole lifecycle
		// left the row without an owner.
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.id).toBe(job.id);
		expect(row.workflowId).toBeNull();
		expect(row.nodeId).toBeNull();
		expect(row.lastFiredAt).not.toBeNull();

		// Retention treats the finished occurrence like any other's.
		const pruned = await createScheduler({
			hostId: 'main-system-job-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			retention: {
				retentionSeconds: 0,
				failedRetentionSeconds: 0,
				batchSize: 10,
				maxBatchesPerPass: 10,
			},
		}).prune();
		expect(pruned).toMatchObject({ deleted: 1 });
		expect(await taskRepo.count()).toBe(0);
	}, 15_000);

	it('under coalesce_owner, ownerless jobs are not grouped: each keeps its own catch-up run', async () => {
		// Two system jobs overdue beyond their grace. With an owner they would
		// coalesce into one catch-up run; without one, `coalesce_owner` must leave
		// each job its own late run instead of grouping unrelated system jobs.
		const misfire = {
			misfirePolicy: 'coalesce_owner',
			misfireGraceSeconds: 30,
			nextRunAt: new Date(Date.now() - 100_000),
		} as const;
		const first = await createSystemJob({ name: 'system:catch-up-a', ...misfire });
		const second = await createSystemJob({ name: 'system:catch-up-b', ...misfire });

		const summary = await scheduler.materialize();

		expect(summary).toMatchObject({ claimedJobs: 2, occurrences: 2 });
		const tasks = await taskRepo.find();
		expect(new Set(tasks.map((task) => task.jobId))).toEqual(new Set([first.id, second.id]));
		for (const task of tasks) {
			expect(task.status).toBe('pending');
			// A catch-up run: offered now, standing in for the missed fire time.
			expect(task.runAt.getTime()).toBeGreaterThan(task.scheduledFor.getTime());
		}
	});
});
