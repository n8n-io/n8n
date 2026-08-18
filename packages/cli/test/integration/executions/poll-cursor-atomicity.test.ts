import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { PollerConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	PollLeaseFence,
	ScheduledTask,
	WorkflowEntity,
} from '@n8n/db';
import {
	ExecutionEntity,
	ExecutionRepository,
	PollerStateRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	ScheduledTaskStatus,
	TransactionRunner,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { POLL_TRIGGER_TASK_TYPE } from '@/scheduling/poll-trigger-node/poll-trigger-task';
import { DurablePollerGateService } from '@/workflows/triggers/durable-poller-gate.service';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';

import { createDueJobFactory, seedDueTask } from '../scheduling/shared/job-factory';

// The duplicate-trigger-id gate is fail-closed until a boot scan runs; open it
// so the config flag alone controls the paths under test.
mockInstance(DurablePollerGateService, { allowed: true });

describe('poll cursor atomicity', () => {
	const nodeId = 'node-1';

	let pollCursorService: PollCursorService;
	let executionPersistence: ExecutionPersistence;
	let executionRepository: ExecutionRepository;
	let pollerStateRepository: PollerStateRepository;
	let scheduledJobRepository: ScheduledJobRepository;
	let scheduledTaskRepository: ScheduledTaskRepository;
	let transactionRunner: TransactionRunner;
	let pollerConfig: PollerConfig;
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		pollCursorService = Container.get(PollCursorService);
		executionPersistence = Container.get(ExecutionPersistence);
		executionRepository = Container.get(ExecutionRepository);
		pollerStateRepository = Container.get(PollerStateRepository);
		scheduledJobRepository = Container.get(ScheduledJobRepository);
		scheduledTaskRepository = Container.get(ScheduledTaskRepository);
		transactionRunner = Container.get(TransactionRunner);
		pollerConfig = Container.get(PollerConfig);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'PollerState',
			'ExecutionEntity',
			'WorkflowEntity',
			'ScheduledTask',
			'ScheduledJob',
		]);
		workflow = await createWorkflow();
		// Atomicity is flag-gated; enable it for these tests.
		pollerConfig.durableCursorsEnabled = true;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const buildPayload = (deduplicationKey?: string): CreateExecutionPayload => ({
		data: createEmptyRunExecutionData(),
		workflowData: workflow,
		mode: 'trigger',
		finished: false,
		status: 'new',
		workflowId: workflow.id,
		deduplicationKey,
	});

	const buildExecutionEntity = (): Partial<ExecutionEntity> => ({
		finished: false,
		mode: 'trigger',
		status: 'new',
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: new Date(),
		workflowId: workflow.id,
	});

	it('commits the cursor advance and the execution row together', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		const result = await pollCursorService.commitWithExecution({
			workflowId: workflow.id,
			nodeId,
			cursor: { lastItemId: 'b' },
			payload: buildPayload(),
		});
		if (result === null) throw new Error('expected a commit result');
		const { executionId } = result;

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.findOneBy({ id: executionId })).toMatchObject({
			status: 'new',
			workflowId: workflow.id,
		});
	});

	it('leaves the cursor unadvanced and writes no execution when the insert fails', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		const key = 'wf:node-1:t1';
		// A dispatched execution already holds this key, so the insert violates the
		// unique index from inside the transaction.
		const existingId = await executionPersistence.create({
			...buildPayload(key),
			status: 'running',
		});

		await expect(
			pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(key),
			}),
		).rejects.toThrow();

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'a',
		});
		const executions = await executionRepository.find({ select: ['id'] });
		expect(executions.map((e) => e.id)).toEqual([existingId]);
	});

	it('persists a standalone cursor advance with no execution row', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		await pollCursorService.commitCursorOnly({
			workflowId: workflow.id,
			nodeId,
			cursor: { lastItemId: 'b' },
		});

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.find({ select: ['id'] })).toEqual([]);
	});

	it('seeds the cursor from the given blob on the first read and keeps it afterwards', async () => {
		const seeded = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'from-static-data',
		});

		expect(seeded).toEqual({ migrated: true, cursor: { lastItemId: 'from-static-data' } });
		expect(
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'ignored' }),
		).toEqual({ migrated: true, cursor: { lastItemId: 'from-static-data' } });
	});

	it('does not create a row for a node that has never migrated when the flag is off', async () => {
		pollerConfig.durableCursorsEnabled = false;

		const resolved = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'from-static-data',
		});

		expect(resolved).toEqual({ migrated: false });
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toBeNull();
	});

	it('seeds the row from the static-data cursor already accrued while the flag was off, rather than resetting it', async () => {
		pollerConfig.durableCursorsEnabled = false;

		// Simulate several polls accruing a cursor in the node's static data while
		// durable cursors are off: resolveCursor reports `migrated: false` and never
		// touches poller_state, mirroring the unmigrated path e2e-tested in
		// poll-trigger-cursor-unmigrated.spec.ts.
		for (const lastItemId of ['a', 'b', 'c']) {
			expect(await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId })).toEqual({
				migrated: false,
			});
		}
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toBeNull();

		// Flip the flag on for this already-running workflow and poll again, passing
		// through the cursor its static data accrued while the flag was off.
		pollerConfig.durableCursorsEnabled = true;
		const migrated = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'c',
		});

		// The row resumes forward from the accrued value - it is not seeded null, which
		// would otherwise re-emit every item the workflow already saw as unmigrated.
		expect(migrated).toEqual({ migrated: true, cursor: { lastItemId: 'c' } });
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'c',
		});

		// Once migrated, the row is the source of truth: a later poll's static-data
		// blob no longer has any effect, even if it disagrees with the stored cursor.
		expect(
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'stale' }),
		).toEqual({ migrated: true, cursor: { lastItemId: 'c' } });
	});

	it('still advances the cursor when the execution insert fails and the flag is off, for a node that already migrated', async () => {
		// Migrate the row while the flag is on, then flip it off: reads still prefer
		// the row, and the flag only narrows to write atomicity from here on.
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });
		pollerConfig.durableCursorsEnabled = false;

		const key = 'wf:node-1:t1';
		await executionPersistence.create({ ...buildPayload(key), status: 'running' });

		await expect(
			pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(key),
			}),
		).rejects.toThrow();

		// Unlike the flag-on case above, the advance is not rolled back: with the flag
		// off the two writes are independent, reopening the old race as a known cost
		// of the kill switch rather than a fallback to static data.
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
	});

	describe('ExecutionRepository.runInTransaction', () => {
		// The reverse of the rollback test above: there the insert fails, here the insert
		// succeeds and the caller fails afterwards, which only rolls the insert back if
		// the repository joined the caller's transaction rather than opening its own.
		it('joins the caller-supplied transaction so a later failure in the caller rolls back work already run through it', async () => {
			let executionId: string | undefined;

			await expect(
				transactionRunner.run({}, async (ctx) => {
					executionId = await executionRepository.runInTransaction(ctx, async (tx) => {
						const saved = await tx.save(ExecutionEntity, buildExecutionEntity());
						return saved.id;
					});
					throw new Error('caller fails after work already ran');
				}),
			).rejects.toThrow('caller fails after work already ran');

			expect(await executionRepository.findOneBy({ id: executionId })).toBeNull();
		});
	});

	describe('fenced commits', () => {
		let createDueJob: ReturnType<typeof createDueJobFactory>;

		beforeEach(() => {
			createDueJob = createDueJobFactory(
				scheduledJobRepository,
				POLL_TRIGGER_TASK_TYPE,
				'poll-fence-job',
			);
		});

		const seedRunningTask = async (
			overrides: Partial<ScheduledTask> = {},
		): Promise<ScheduledTask> => {
			const job = await createDueJob();
			const task = await seedDueTask(scheduledTaskRepository, POLL_TRIGGER_TASK_TYPE, job.id);
			return await scheduledTaskRepository.save({
				...task,
				status: ScheduledTaskStatus.Running,
				leaseEpoch: 1,
				leaseExpiresAt: new Date(Date.now() + 60_000),
				claimedBy: 'host-1',
				...overrides,
			});
		};

		it.each([
			{
				title: 'the fence lease epoch no longer matches the claimed task',
				prepareFence: async (): Promise<PollLeaseFence> => {
					const task = await seedRunningTask();
					const fence: PollLeaseFence = { taskId: task.id, leaseEpoch: task.leaseEpoch };
					await scheduledTaskRepository.update(task.id, { leaseEpoch: task.leaseEpoch + 1 });
					return fence;
				},
			},
			{
				title: 'the fenced task row no longer exists',
				prepareFence: async (): Promise<PollLeaseFence> => {
					const task = await seedRunningTask();
					const fence: PollLeaseFence = { taskId: task.id, leaseEpoch: task.leaseEpoch };
					await scheduledTaskRepository.delete(task.id);
					return fence;
				},
			},
			{
				title: 'the fenced task id never existed',
				prepareFence: (): PollLeaseFence => ({ taskId: '999999999', leaseEpoch: 1 }),
			},
			{
				// Marking a task failed does not bump its lease epoch, so the status
				// alone must stop the late commit.
				title: 'the fenced task was marked failed, with its lease epoch unchanged',
				prepareFence: async (): Promise<PollLeaseFence> => {
					const task = await seedRunningTask();
					const fence: PollLeaseFence = { taskId: task.id, leaseEpoch: task.leaseEpoch };
					await scheduledTaskRepository.update(task.id, { status: ScheduledTaskStatus.Failed });
					return fence;
				},
			},
		])('does not commit when $title', async ({ prepareFence }) => {
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });
			const fence = await prepareFence();

			const result = await pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(),
				fence,
			});

			expect(result).toBeNull();
			expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
				lastItemId: 'a',
			});
			expect(await executionRepository.find({ select: ['id'] })).toEqual([]);
		});

		it.each([
			{
				title: 'the fence matches a task row still running',
				buildFence: async (): Promise<PollLeaseFence> => {
					const task = await seedRunningTask();
					return { taskId: task.id, leaseEpoch: task.leaseEpoch };
				},
			},
			{
				title: 'the fenced task was already marked succeeded by its executor',
				buildFence: async (): Promise<PollLeaseFence> => {
					const task = await seedRunningTask({ status: ScheduledTaskStatus.Succeeded });
					return { taskId: task.id, leaseEpoch: task.leaseEpoch };
				},
			},
			{
				title:
					'the fence names a task unrelated to the cursor row being advanced, since the guard checks only the task id and lease epoch',
				buildFence: async (): Promise<PollLeaseFence> => {
					const unrelatedTask = await seedRunningTask();
					return { taskId: unrelatedTask.id, leaseEpoch: unrelatedTask.leaseEpoch };
				},
			},
			{
				title: 'there is no fence at all, exactly as an unfenced call commits today',
				buildFence: async (): Promise<PollLeaseFence | undefined> => {
					await seedRunningTask();
					return undefined;
				},
			},
		])('commits when $title', async ({ buildFence }) => {
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });
			const fence = await buildFence();

			const result = await pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(),
				fence,
			});

			expect(result).not.toBeNull();
			expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
				lastItemId: 'b',
			});
			expect(await executionRepository.findOneBy({ id: result?.executionId })).toMatchObject({
				status: 'new',
				workflowId: workflow.id,
			});
		});

		it('throws and stores nothing when the cursor row disappeared mid-poll, even with a live fence', async () => {
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });
			const task = await seedRunningTask();
			const fence: PollLeaseFence = { taskId: task.id, leaseEpoch: task.leaseEpoch };
			await pollerStateRepository.delete({ workflowId: workflow.id, nodeId });

			await expect(
				pollCursorService.commitWithExecution({
					workflowId: workflow.id,
					nodeId,
					cursor: { lastItemId: 'b' },
					payload: buildPayload(),
					fence,
				}),
			).rejects.toThrow('Poller cursor row disappeared while its poll was running');
			expect(await executionRepository.find({ select: ['id'] })).toEqual([]);
		});
	});
});
