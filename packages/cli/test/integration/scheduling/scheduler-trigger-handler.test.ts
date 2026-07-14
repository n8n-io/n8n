import { testDb, createWorkflowWithHistory, setActiveVersion } from '@n8n/backend-test-utils';
import {
	DataSource,
	ExecutionRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '@/scheduling/schedule-trigger-node/schedule-trigger-task';
import { ScheduleTriggerTaskHandler } from '@/scheduling/schedule-trigger-node/schedule-trigger-task-handler';

import { createOwner } from '../shared/db/users';
import { retryUntil } from '../shared/retry-until';
import * as utils from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

/**
 * The whole schedule-trigger path against a real database and the real engine:
 * a due occurrence materialized from a job, claimed and fired by the executor,
 * handed to the real {@link ScheduleTriggerTaskHandler}, which turns it into a
 * persisted workflow execution. The handler unit suite mocks the execution
 * service and the context factory; this proves the seams line up at runtime and
 * that the occurrence-keyed redelivery backstop actually fires against the real
 * execution dedup index.
 */
describe('schedule-trigger occurrence to a real execution', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let executionRepo: ExecutionRepository;
	let scheduler: Scheduler & SchedulerPasses;
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwner();

		await utils.initNodeTypes(
			loadNodesFromDist(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.noOp']),
		);
		await utils.initBinaryDataService();

		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		executionRepo = Container.get(ExecutionRepository);

		scheduler = createScheduler({
			hostId: 'main-trigger-handler',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
		});
		scheduler.registerTaskHandler(
			SCHEDULE_TRIGGER_TASK_TYPE,
			Container.get(ScheduleTriggerTaskHandler),
		);
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	// A published workflow whose Schedule Trigger the handler fires. The published
	// version mapping is what `loadPublishedWorkflowData` reads, so all three parts
	// (workflow, history, mapping) must exist.
	const createPublishedScheduleWorkflow = async () => {
		const triggerNodeId = uuid();
		const workflow = await createWorkflowWithHistory(
			{
				active: true,
				nodes: [
					{
						id: triggerNodeId,
						name: 'ScheduleTrigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: uuid(),
						name: 'NoOp',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
				],
				connections: {
					ScheduleTrigger: {
						main: [[{ node: 'NoOp', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			},
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
			workflow.id,
			workflow.versionId,
		);
		return { workflow, triggerNodeId };
	};

	let seq = 0;
	const createScheduleJob = async (workflowId: string, nodeId: string) =>
		await jobRepo.save(
			jobRepo.create({
				name: `schedule-job-${++seq}`,
				taskType: SCHEDULE_TRIGGER_TASK_TYPE,
				payload: { workflowId, nodeId },
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(Date.now() - 1000),
				maxAttempts: 3,
			}),
		);

	it('materializes a due occurrence and hands it off to a real execution', async () => {
		const { workflow, triggerNodeId } = await createPublishedScheduleWorkflow();
		const job = await createScheduleJob(workflow.id, triggerNodeId);

		await scheduler.materialize();
		await scheduler.execute();

		await retryUntil(
			async () => {
				const task = await taskRepo.findOneByOrFail({ jobId: job.id });
				expect(task.status).toBe('succeeded');
			},
			{ timeoutMs: 15_000 },
		);

		const task = await taskRepo.findOneByOrFail({ jobId: job.id });
		const deduplicationKey = `${job.id}:${task.scheduledFor.toISOString()}`;

		await retryUntil(
			async () => {
				const execution = await executionRepo.findOne({ where: { deduplicationKey } });
				expect(execution?.status).toBe('success');
			},
			{ timeoutMs: 15_000 },
		);

		const execution = await executionRepo.findOne({ where: { deduplicationKey } });
		expect(execution).not.toBeNull();
		expect(execution?.status).toBe('success');
		expect(execution?.mode).toBe('trigger');
		expect(execution?.workflowId).toBe(workflow.id);
	}, 30_000);

	it('treats a redelivered occurrence as a no-op via the execution dedup index', async () => {
		const { workflow, triggerNodeId } = await createPublishedScheduleWorkflow();
		const job = await createScheduleJob(workflow.id, triggerNodeId);

		await scheduler.materialize();
		await scheduler.execute();
		await retryUntil(
			async () => {
				const task = await taskRepo.findOneByOrFail({ jobId: job.id });
				expect(task.status).toBe('succeeded');
			},
			{ timeoutMs: 15_000 },
		);

		const task = await taskRepo.findOneByOrFail({ jobId: job.id });
		const deduplicationKey = `${job.id}:${task.scheduledFor.toISOString()}`;
		await retryUntil(
			async () => {
				const execution = await executionRepo.findOne({ where: { deduplicationKey } });
				expect(execution).not.toBeNull();
			},
			{ timeoutMs: 15_000 },
		);

		// Redeliver the same occurrence: the row goes back to pending (the way a
		// reaper hands a stalled-but-actually-finished task to another instance),
		// so the executor claims and fires it a second time.
		await taskRepo.update(
			{ id: task.id },
			{
				status: 'pending',
				claimedBy: null,
				leaseExpiresAt: null,
				startedAt: null,
				finishedAt: null,
				runAt: new Date(Date.now() - 1000),
			},
		);

		await scheduler.execute();
		await retryUntil(
			async () => {
				const redelivered = await taskRepo.findOneByOrFail({ id: task.id });
				expect(redelivered.status).toBe('succeeded');
			},
			{ timeoutMs: 15_000 },
		);

		// The dedup index rejected the second handoff, so there is still exactly one
		// execution for the occurrence.
		const executions = await executionRepo.find({ where: { deduplicationKey } });
		expect(executions).toHaveLength(1);
	}, 30_000);
});
