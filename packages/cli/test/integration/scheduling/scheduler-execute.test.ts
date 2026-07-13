import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

/**
 * The composed path against a real database: the storage bindings
 * (`buildMaterializerTransaction` plus the repositories as the task store)
 * composed by `createScheduler`, a registered handler, and the full
 * materialize -> claim -> fire -> terminal-write lifecycle. The unit suites
 * cover each piece with mocks; this proves the structural seams line up at
 * runtime.
 */
describe('scheduler execution over the storage bindings', () => {
	const TASK_TYPE = 'integration-execute-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;
	const executed: ClaimedTask[] = [];

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		scheduler = createScheduler({
			hostId: 'main-execute-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
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

	let seq = 0;
	const createJob = async (overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name: `job-exec-${++seq}`,
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

	it('materializes, claims, fires the handler, and records success', async () => {
		const job = await createJob({ payload: { answer: 42 } });

		const summary = await scheduler.materialize();
		expect(summary).toMatchObject({ claimedJobs: 1, occurrences: 1, deferredJobs: 0 });

		// The occurrence is already due, so the claim schedules an immediate fire.
		const claimed = await scheduler.execute();
		expect(claimed).toHaveLength(1);
		expect(claimed[0].taskType).toBe(TASK_TYPE);

		await waitFor(
			async () => (await taskRepo.findOneByOrFail({ jobId: job.id })).status === 'succeeded',
		);

		expect(executed).toHaveLength(1);
		expect(executed[0].payload).toEqual({ answer: 42 });
		const done = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(done.finishedAt).not.toBeNull();
		expect(done.startedAt).not.toBeNull();
		// Terminal rows keep the claim as the record of who ran them.
		expect(done.claimedBy).toMatch(/^main-/);
	}, 15_000);

	it('reaps a task stranded by an expired lease back to pending', async () => {
		const job = await createJob();
		const past = new Date(Date.now() - 60_000);
		await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: past,
				runAt: past,
				status: 'running',
				claimedBy: 'main-dead',
				leaseExpiresAt: new Date(Date.now() - 1000),
				leaseEpoch: 1,
				attempts: 1,
				maxAttempts: 3,
			}),
		);

		const result = await scheduler.reap();

		expect(result).toEqual({ reclaimed: 1, deadLettered: 0 });
		const recovered = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(recovered.status).toBe('pending');
		expect(recovered.claimedBy).toBeNull();
		expect(recovered.leaseEpoch).toBe(2);
		expect(recovered.errorMessage).toBe('Lease expired before completion');
	});

	// Last on purpose: it stops the shared scheduler's executor.
	it('releases claimed but unfired tasks on stop', async () => {
		const job = await createJob();
		// Due within the executor's lookahead but far enough out that stop() runs
		// well before the fire timer does.
		const soon = new Date(Date.now() + 4000);
		await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: soon,
				runAt: soon,
				maxAttempts: 3,
			}),
		);

		const claimed = await scheduler.execute();
		expect(claimed).toHaveLength(1);

		await scheduler.stop();

		const released = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(released.status).toBe('pending');
		expect(released.claimedBy).toBeNull();
		expect(executed).toHaveLength(0);
	});
});
