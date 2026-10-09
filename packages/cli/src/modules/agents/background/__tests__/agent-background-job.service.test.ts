import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Mock } from 'vitest';
import { WorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { AgentExecutionUpdateBroadcaster } from '../../agent-execution-update-broadcaster';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { AgentMessageEntity } from '../../entities/agent-message.entity';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import {
	AgentBackgroundJobService,
	EXPIRED_BACKGROUND_CHECKPOINT_ERROR,
	MAX_RUNNING_JOBS_PER_THREAD,
	SETTLED_JOB_RETENTION_MS,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	WORKFLOW_JOB_RESULT_MAX_CHARS,
	serializeWorkflowJobResult,
	settlementStatusForExecution,
} from '../agent-background-job.service';
import { AgentWakeService } from '../agent-wake.service';

function makeWorkflowJob(overrides: Partial<AgentBackgroundJob> = {}): AgentBackgroundJob {
	return makeJob({
		id: 'wf-job-1',
		kind: 'workflow',
		subAgentId: null,
		childThreadId: null,
		childExecutionId: 'exec-1',
		workflowId: 'workflow-1',
		timeoutAt: null,
		...overrides,
	});
}

function makeJob(overrides: Partial<AgentBackgroundJob> = {}): AgentBackgroundJob {
	return {
		id: 'job-1',
		kind: 'subagent',
		status: 'running',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		parentResourceId: 'draft-chat:user-1',
		parentPrincipalHash: 'principal-hash',
		title: 'research',
		subAgentId: 'sub-1',
		childThreadId: 'child-thread-1',
		childExecutionId: null,
		workflowId: null,
		timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		result: null,
		error: null,
		settledAt: null,
		notifiedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as AgentBackgroundJob;
}

function setup(options: { backgroundTasksEnabled?: boolean } = {}) {
	const jobRepository = mock<AgentBackgroundJobRepository>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionRepository = mock<AgentExecutionRepository>();
	const messageRepository = mock<AgentMessageRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();
	const updateBroadcaster = mock<AgentExecutionUpdateBroadcaster>();
	const agentsConfig = mock<AgentsConfig>({
		backgroundTasksEnabled: options.backgroundTasksEnabled ?? false,
		checkpointTtlSeconds: 96 * 3600,
	});
	(logger.scoped as Mock).mockReturnValue(logger);

	jobRepository.insertSubAgentJobIfCapacity.mockResolvedValue(true);
	jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({ inserted: true });
	jobRepository.settleIfActive.mockResolvedValue(true);
	jobRepository.findByParentThread.mockResolvedValue([]);
	jobRepository.findGroupCandidates.mockResolvedValue([]);
	jobRepository.findRunningJobs.mockResolvedValue([]);
	jobRepository.findActivePastTimeout.mockResolvedValue([]);
	jobRepository.findSettledSubAgentsWithCheckpoints.mockResolvedValue([]);
	jobRepository.findRequestedPauses.mockResolvedValue([]);
	jobRepository.findPausedWithoutCheckpoint.mockResolvedValue([]);
	jobRepository.retainLatestStopGroup.mockResolvedValue([]);
	jobRepository.reservePausedGroup.mockResolvedValue('reserved');
	executionRepository.findRunningByThread.mockResolvedValue([]);
	executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(new Map());

	const service = new AgentBackgroundJobService(
		jobRepository,
		executionRepository,
		executionPersistence,
		publisher,
		logger,
		agentsConfig,
		updateBroadcaster,
		checkpointStorage,
		messageRepository,
	);
	return {
		service,
		checkpointStorage,
		jobRepository,
		executionRepository,
		messageRepository,
		executionPersistence,
		publisher,
		logger,
		updateBroadcaster,
	};
}

const registerParams = {
	id: 'job-1',
	parentAgentId: 'agent-1',
	parentThreadId: 'thread-1',
	parentResourceId: 'draft-chat:user-1',
	parentPrincipalHash: 'principal-hash',
	title: 'research',
	subAgentId: 'sub-1',
	childThreadId: 'child-thread-1',
};

describe('markMailConsumed', () => {
	afterEach(() => Container.reset());

	it.each([true, false])(
		'defers delivery status only while a wake is active (%s)',
		async (active) => {
			const { service, jobRepository } = setup({ backgroundTasksEnabled: true });
			const wakeService = mock<AgentWakeService>();
			wakeService.isWakeActive.mockReturnValue(active);
			Container.set(AgentWakeService, wakeService);
			jobRepository.markMailConsumed.mockResolvedValue(1);

			const count = await service.markMailConsumed('thread-1', ['job-1']);

			expect(wakeService.isWakeActive).toHaveBeenCalledWith('thread-1');
			expect(count).toBe(active ? 0 : 1);
			if (active) expect(jobRepository.markMailConsumed).not.toHaveBeenCalled();
			else
				expect(jobRepository.markMailConsumed).toHaveBeenCalledWith('thread-1', ['job-1'], false);
		},
	);
});

describe('user pause', () => {
	afterEach(() => Container.reset());

	it('attempts every selected workflow and keeps a failed cancellation available for retry', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		const first = makeWorkflowJob({ pauseRequestId: 'stop-1' });
		const second = makeWorkflowJob({
			id: 'wf-job-2',
			childExecutionId: 'exec-2',
			pauseRequestId: 'stop-1',
		});
		const child = makeJob({ status: 'suspended', pauseRequestId: 'stop-1' });
		const jobs = [first, second, child];
		jobRepository.findByParentThread.mockResolvedValue([
			...jobs,
			makeWorkflowJob({ id: 'later', childExecutionId: 'later-execution' }),
			makeWorkflowJob({
				id: 'other-author',
				childExecutionId: 'other-execution',
				parentResourceId: 'draft-chat:other',
				pauseRequestId: 'other-stop',
			}),
		]);
		jobRepository.findById.mockImplementation(
			async (id) => jobs.find((job) => job.id === id) ?? null,
		);
		jobRepository.settleIfActive.mockImplementation(async (id, settlement) => {
			Object.assign(jobs.find((job) => job.id === id)!, settlement);
			return true;
		});
		const pause = vi.spyOn(service, 'pause').mockResolvedValue(true);
		const executionService = mock<ExecutionService>();
		executionService.stop.mockRejectedValueOnce(new Error('Stop failed'));
		Container.set(ExecutionService, executionService);
		executionPersistence.findSingleExecution.mockResolvedValue({
			data: {
				resultData: {
					runData: {
						Send: [{ data: { main: [[{ json: { sent: true } }]] } }],
						Wait: [{ data: { main: [[]] } }],
					},
				},
			},
		} as never);

		await expect(service.requestPause('agent-1', 'thread-1', 'draft-chat:user-1')).rejects.toThrow(
			'Stop failed',
		);
		expect(executionService.stop.mock.calls).toEqual([
			['exec-1', ['workflow-1']],
			['exec-2', ['workflow-1']],
		]);
		expect(jobRepository.requestPause.mock.invocationCallOrder[0]).toBeLessThan(
			executionService.stop.mock.invocationCallOrder[0],
		);
		expect(pause).toHaveBeenCalledWith(child.id);
		expect(first).toMatchObject({ status: 'running', pauseRequestId: 'stop-1', notifiedAt: null });
		expect(second).toMatchObject({
			status: 'cancelled',
			result: '{"Send":[{"sent":true}]}',
			notifiedAt: null,
		});
		expect(jobRepository.markMailConsumed).not.toHaveBeenCalled();

		await service.requestPause('agent-1', 'thread-1', 'draft-chat:user-1');
		expect(executionService.stop).toHaveBeenCalledTimes(3);
		expect(executionService.stop).toHaveBeenLastCalledWith('exec-1', ['workflow-1']);
		expect(first.status).toBe('cancelled');
	});

	it.each(['success', 'error'] as const)(
		'keeps a workflow outcome that reaches %s before cancellation',
		async (status) => {
			const { service, jobRepository, executionPersistence } = setup();
			const job = makeWorkflowJob({ pauseRequestId: 'stop-1' });
			jobRepository.findByParentThread.mockResolvedValue([job]);
			const executionService = mock<ExecutionService>();
			executionService.stop.mockRejectedValue(new WorkflowOperationError('Already finished'));
			Container.set(ExecutionService, executionService);
			executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status }]);

			await service.requestPause('agent-1', 'thread-1', 'draft-chat:user-1');

			expect(jobRepository.settleIfActive).toHaveBeenCalledExactlyOnceWith(
				job.id,
				expect.objectContaining({ status: status === 'success' ? 'completed' : 'failed' }),
				undefined,
			);
			expect(jobRepository.markMailConsumed).not.toHaveBeenCalled();
		},
	);

	it.each([
		{
			name: 'a retained checkpoint',
			checkpoint: true,
			active: false,
			status: 'running',
			expected: 'running',
		},
		{
			name: 'an active child',
			checkpoint: false,
			active: true,
			status: 'running',
			expected: 'running',
		},
		{
			name: 'an already paused job',
			checkpoint: false,
			active: false,
			status: 'paused',
			expected: 'paused',
		},
		{
			name: 'a lost checkpoint',
			checkpoint: false,
			active: false,
			status: 'running',
			expected: 'failed',
		},
	] as const)(
		'handles $name when a paused result cannot be recorded',
		async ({ checkpoint, active, status, expected }) => {
			const { service, jobRepository, executionRepository, checkpointStorage } = setup();
			const job = makeJob({ status, pauseRequestId: 'stop-1' });
			vi.spyOn(service, 'suspend').mockResolvedValue(false);
			vi.spyOn(service, 'getCheckpoint').mockResolvedValue(checkpoint ? mock() : undefined);
			executionRepository.existsRunningByThread.mockResolvedValue(active);
			jobRepository.findById.mockResolvedValue(job);
			jobRepository.settleIfActive.mockImplementation(async (_id, settlement) => {
				job.status = settlement.status;
				job.error = settlement.error ?? null;
				return true;
			});

			await service.settlePausedSubAgent(job.id, { status: 'running' });

			expect(job.status).toBe(expected);
			expect(job.error).toBe(expected === 'failed' ? EXPIRED_BACKGROUND_CHECKPOINT_ERROR : null);
			expect(checkpointStorage.deleteDelegatedForThread.mock.calls.length).toBe(
				expected === 'failed' ? 1 : 0,
			);
		},
	);

	it.each<{
		name: string;
		job?: Partial<AgentBackgroundJob>;
		receivedAt?: number;
		execution?: Partial<AgentExecution>;
		input?: Partial<AgentMessageEntity>;
		admission?: 'limit-reached';
		expected: 'stopping' | 'ready' | 'unavailable' | 'limit-reached';
	}>([
		{
			name: 'a running job',
			job: { status: 'running', notifiedAt: null },
			expected: 'stopping',
		},
		{ name: 'an unreported pause', job: { notifiedAt: null }, expected: 'stopping' },
		{ name: 'input received before the report', receivedAt: 1000, expected: 'stopping' },
		{ name: 'input received after the report', expected: 'ready' },
		{
			name: 'a cancelled workflow after its report',
			job: {
				kind: 'workflow',
				status: 'cancelled',
				workflowId: 'workflow-1',
				childExecutionId: 'exec-1',
			},
			expected: 'ready',
		},
		{
			name: 'a cancelled workflow before its report',
			job: { kind: 'workflow', status: 'cancelled', notifiedAt: null },
			expected: 'stopping',
		},
		{
			name: 'a workflow Continue queued before the report',
			job: { kind: 'workflow', status: 'cancelled' },
			receivedAt: 1000,
			execution: { startedAt: new Date(4000) },
			expected: 'stopping',
		},
		{ name: 'too few active slots', admission: 'limit-reached', expected: 'limit-reached' },
		{
			name: 'a resume reservation from an earlier parent turn',
			job: { status: 'suspended', updatedAt: new Date(2500) },
			execution: { startedAt: new Date(4000) },
			expected: 'ready',
		},
		{
			name: 'a resume reservation from the current parent turn',
			job: { status: 'suspended', updatedAt: new Date(4500) },
			execution: { startedAt: new Date(4000) },
			expected: 'stopping',
		},
		{
			name: 'a finished parent execution',
			execution: { status: 'success' },
			expected: 'unavailable',
		},
		{
			name: 'a parent execution in another thread',
			execution: { threadId: 'other-thread' },
			expected: 'unavailable',
		},
		{
			name: 'only hidden input',
			input: { origin: { source: null, hidden: true } },
			expected: 'unavailable',
		},
		{
			name: 'input from another resource',
			input: { resourceId: 'draft-chat:other' },
			expected: 'unavailable',
		},
	])(
		'returns $expected for $name',
		async ({ job: jobOverrides, receivedAt = 3000, execution, input, admission, expected }) => {
			const { service, jobRepository, executionRepository, messageRepository } = setup();
			const job = makeJob({
				status: 'paused',
				pauseRequestId: 'stop-1',
				notifiedAt: new Date(2000),
				...jobOverrides,
			});
			jobRepository.findRequestedPauses.mockResolvedValue([job]);
			jobRepository.releasePausedResume.mockImplementation(async () => {
				job.status = 'paused';
				job.timeoutAt = null;
				return true;
			});
			jobRepository.findByParentThread.mockResolvedValue([
				job,
				makeJob({
					id: 'other-job',
					parentResourceId: 'draft-chat:other',
					pauseRequestId: 'stop-2',
				}),
			]);
			executionRepository.findExecution.mockResolvedValue(
				mock<AgentExecution>({ threadId: 'thread-1', status: 'running', ...execution }),
			);
			messageRepository.findExecutionInputs.mockResolvedValue(
				new Map([
					[
						'execution-1',
						[
							mock<AgentMessageEntity>({
								role: 'user',
								origin: null,
								threadId: 'thread-1',
								resourceId: 'draft-chat:user-1',
								createdAt: new Date(receivedAt),
								...input,
							}),
						],
					],
				]),
			);
			if (admission) jobRepository.reservePausedGroup.mockResolvedValue(admission);
			const result = await service.preparePausedResume(
				'agent-1',
				'thread-1',
				'draft-chat:user-1',
				'execution-1',
			);
			expect(result).toMatchObject({
				status: expected,
				jobs: expected === 'ready' && job.kind === 'subagent' ? [job] : [],
			});
			if (expected === 'ready' && job.kind === 'workflow') {
				expect(result).toMatchObject({
					workflowsToRestart: [
						{ jobId: job.id, workflowId: 'workflow-1', previousExecutionId: 'exec-1' },
					],
				});
				expect(jobRepository.reservePausedGroup).not.toHaveBeenCalled();
			}
			if (expected === 'stopping' || expected === 'unavailable')
				expect(jobRepository.reservePausedGroup).not.toHaveBeenCalled();
		},
	);

	it.each(['stop-1', 'stop-2'])('continues the latest stop group (%s)', async (pausedGroup) => {
		const { service, jobRepository, executionRepository, messageRepository } = setup();
		const paused = makeJob({
			status: 'paused',
			pauseRequestId: pausedGroup,
			notifiedAt: new Date(2000),
		});
		const workflow = makeWorkflowJob({
			status: 'cancelled',
			pauseRequestId: 'stop-2',
			notifiedAt: new Date(2000),
		});
		jobRepository.findByParentThread.mockResolvedValue([
			paused,
			workflow,
			makeWorkflowJob({
				id: 'old-workflow',
				status: 'cancelled',
				pauseRequestId: 'stop-1',
				notifiedAt: new Date(1000),
			}),
			makeWorkflowJob({
				id: 'completed-workflow',
				status: 'completed',
				pauseRequestId: 'stop-2',
				notifiedAt: new Date(2000),
			}),
			makeWorkflowJob({
				id: 'failed-workflow',
				status: 'failed',
				pauseRequestId: 'stop-2',
				notifiedAt: new Date(2000),
			}),
		]);
		executionRepository.findExecution.mockResolvedValue(
			mock<AgentExecution>({ threadId: 'thread-1', status: 'running' }),
		);
		messageRepository.findExecutionInputs.mockResolvedValue(
			new Map([
				[
					'execution-1',
					[
						mock<AgentMessageEntity>({
							role: 'user',
							origin: null,
							threadId: 'thread-1',
							resourceId: 'draft-chat:user-1',
							createdAt: new Date(3000),
						}),
					],
				],
			]),
		);

		const result = await service.preparePausedResume(
			'agent-1',
			'thread-1',
			'draft-chat:user-1',
			'execution-1',
		);

		expect(result).toMatchObject({
			status: 'ready',
			jobs: pausedGroup === 'stop-2' ? [paused] : [],
			workflowsToRestart: [
				{
					jobId: workflow.id,
					title: workflow.title,
					workflowId: workflow.workflowId,
					previousExecutionId: workflow.childExecutionId,
				},
			],
		});
		if (pausedGroup === 'stop-2') {
			expect(jobRepository.reservePausedGroup).toHaveBeenCalledWith(
				'thread-1',
				'stop-2',
				[paused.id],
				expect.any(Date),
				MAX_RUNNING_JOBS_PER_THREAD,
			);
		} else {
			expect(jobRepository.reservePausedGroup).not.toHaveBeenCalled();
		}
	});

	it('keeps stopped children visible until their stop group settles and retains other tasks', async () => {
		const { service, jobRepository } = setup();
		const stopping = makeJob({ pauseRequestId: 'stop-1', createdAt: new Date(1000) });
		const last = makeJob({
			id: 'job-2',
			status: 'suspended',
			pauseRequestId: 'stop-1',
			createdAt: new Date(2000),
		});
		const workflow = makeWorkflowJob({
			createdAt: new Date(3000),
			status: 'cancelled',
			pauseRequestId: 'stop-1',
			settledAt: new Date(4000),
		});
		jobRepository.findGroupCandidates.mockResolvedValue([stopping, last, workflow]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([
			stopping,
			last,
			workflow,
		]);
		const paused = { ...stopping, status: 'paused' as const, settledAt: new Date(4000) };
		jobRepository.findGroupCandidates.mockResolvedValue([paused, last, workflow]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([
			paused,
			last,
			workflow,
		]);
		const later = makeJob({ id: 'later', createdAt: new Date(5000) });
		for (const status of ['paused', 'completed', 'failed', 'cancelled'] as const) {
			jobRepository.findGroupCandidates.mockResolvedValue([
				paused,
				{ ...last, status },
				workflow,
				later,
			]);
			expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([later]);
		}
		jobRepository.findGroupCandidates.mockResolvedValue([paused]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([]);
		jobRepository.findGroupCandidates.mockResolvedValue([{ ...stopping, pauseRequestId: null }]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toHaveLength(1);
	});
});

describe('background task notifications', () => {
	it('notifies after registration succeeds, but not after a limit or insert error', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		await service.registerSubAgentJob(registerParams);
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
		expect(jobRepository.insertSubAgentJobIfCapacity.mock.invocationCallOrder[0]).toBeLessThan(
			updateBroadcaster.notifyBackgroundJobsUpdated.mock.invocationCallOrder[0],
		);
		jobRepository.insertSubAgentJobIfCapacity.mockResolvedValueOnce(false);
		await service.registerSubAgentJob(registerParams);
		jobRepository.insertSubAgentJobIfCapacity.mockRejectedValueOnce(new Error('insert failed'));
		await expect(service.registerSubAgentJob(registerParams)).rejects.toThrow('insert failed');
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledOnce();
	});

	it.each(['completed', 'failed', 'cancelled'] as const)(
		'notifies after the task reaches %s',
		async (status) => {
			const { service, jobRepository, updateBroadcaster } = setup();
			jobRepository.findById.mockResolvedValue(makeJob({ status }));
			await service.settle('job-1', { status });
			expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
				'agent-1',
				'thread-1',
			);
			jobRepository.settleIfActive.mockResolvedValueOnce(false);
			await service.settle('job-1', { status });
			expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledOnce();
		},
	);

	it.each(['subagent', 'workflow'] as const)(
		'notifies after an external cancellation of a %s job',
		async (kind) => {
			const { service, jobRepository, updateBroadcaster } = setup();
			jobRepository.findByParentThread.mockResolvedValue([makeJob({ kind })]);
			await service.cancel('thread-1', 'job-1');
			expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
				'agent-1',
				'thread-1',
			);
		},
	);

	it('notifies when the timeout sweep ends a task', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		const job = makeJob();
		jobRepository.findActivePastTimeout.mockResolvedValue([job]);
		jobRepository.findById.mockResolvedValue(job);
		await service.reconcile();
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
	});

	it('notifies when reconciliation ends a workflow job', async () => {
		const { service, jobRepository, executionPersistence, updateBroadcaster } = setup();
		const job = makeWorkflowJob();
		jobRepository.findRunningJobs.mockResolvedValue([job]);
		jobRepository.findById.mockResolvedValue(job);
		executionPersistence.findStatusesByIds.mockResolvedValue([
			{ id: 'exec-1', status: 'error' },
		] as never);
		await service.reconcileWorkflowJobs();
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
	});
});

describe('registerSubAgentJob', () => {
	it('returns started with the job id and a ~30min timeout', async () => {
		const { service, jobRepository } = setup();

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'job-1' });
		const inserted = jobRepository.insertSubAgentJobIfCapacity.mock.calls[0][0];
		if (inserted.kind !== 'subagent') throw new Error('expected a subagent job insert');
		const expectedTimeout = Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS;
		expect(inserted.timeoutAt.getTime()).toBeGreaterThan(expectedTimeout - 5000);
		expect(inserted.timeoutAt.getTime()).toBeLessThanOrEqual(expectedTimeout);
		expect(jobRepository.insertSubAgentJobIfCapacity.mock.calls[0][1]).toBe(
			MAX_RUNNING_JOBS_PER_THREAD,
		);
	});

	it('returns limit-reached when the thread is at the running-job cap', async () => {
		const { service, jobRepository } = setup();
		jobRepository.insertSubAgentJobIfCapacity.mockResolvedValue(false);

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'limit-reached' });
	});
});

describe('settle', () => {
	afterEach(() => {
		Container.reset();
	});

	it('requests a parent wake after the job settles', async () => {
		const { service, jobRepository } = setup({ backgroundTasksEnabled: true });
		const wakeService = mock<AgentWakeService>();
		Container.set(AgentWakeService, wakeService);
		jobRepository.findById.mockResolvedValue(makeJob({ status: 'completed' }));

		await expect(service.settle('job-1', { status: 'completed', result: 'done' })).resolves.toBe(
			true,
		);

		expect(wakeService.requestWake).toHaveBeenCalledWith('thread-1');
	});

	it('settles the job when the wake request fails or background tasks are disabled', async () => {
		const failing = setup({ backgroundTasksEnabled: true });
		const wakeService = mock<AgentWakeService>();
		wakeService.requestWake.mockRejectedValue(new Error('pubsub unavailable'));
		Container.set(AgentWakeService, wakeService);
		failing.jobRepository.findById.mockResolvedValue(makeJob({ status: 'completed' }));
		await expect(
			failing.service.settle('job-1', { status: 'completed', result: 'done' }),
		).resolves.toBe(true);

		const disabled = setup();
		wakeService.requestWake.mockClear();
		disabled.jobRepository.findById.mockResolvedValue(makeJob({ status: 'completed' }));
		await expect(
			disabled.service.settle('job-1', { status: 'completed', result: 'done' }),
		).resolves.toBe(true);
		expect(wakeService.requestWake).not.toHaveBeenCalled();
		expect(disabled.updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
	});

	it('drops the abort handle even when the settle write throws', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.settleIfActive.mockRejectedValueOnce(new Error('db down'));
		service.registerAbortController('job-1', new AbortController());

		await expect(service.settle('job-1', { status: 'completed', result: 'done' })).rejects.toThrow(
			'db down',
		);

		// A leaked handle would shield the row from orphan reconciliation:
		// with the handle gone, listing consults the child execution status.
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		await service.listForThread('thread-1');
		expect(executionRepository.findLatestStatusesByThreadIds).toHaveBeenCalledWith([
			'child-thread-1',
		]);
	});

	it('keeps the active abort handle when a stale settlement loses', async () => {
		const { service, jobRepository } = setup();
		const job = makeJob();
		jobRepository.findById.mockResolvedValue(job);
		jobRepository.findByParentThread.mockResolvedValue([job]);
		jobRepository.settleIfActive.mockResolvedValueOnce(false);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		const settled = await service.settle(
			'job-1',
			{ status: 'failed' },
			{ status: 'suspended', timeoutAt: new Date(0) },
		);

		expect(settled).toBe(false);
		expect(controller.signal.aborted).toBe(false);
		expect(await service.cancel('thread-1', 'job-1')).toBe('cancelled');
		expect(controller.signal.aborted).toBe(true);
	});
});

describe('listForThread', () => {
	it('settles a running sub-agent job whose child run was interrupted and no live handle exists', async () => {
		const { service, jobRepository, executionRepository } = setup();
		const stale = makeJob();
		const settledView = makeJob({ status: 'failed', error: 'boom' });
		jobRepository.findByParentThread
			.mockResolvedValueOnce([stale])
			.mockResolvedValueOnce([settledView]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'interrupted']]),
		);

		const jobs = await service.listForThread('thread-1');

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed' }),
			expect.objectContaining({ status: 'running', timeoutAt: expect.any(Date) }),
		);
		expect(jobs[0].status).toBe('failed');
	});

	it('leaves a running job alone when this process holds its live handle', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		service.registerAbortController('job-1', new AbortController());

		const jobs = await service.listForThread('thread-1');

		expect(executionRepository.findLatestStatusesByThreadIds).not.toHaveBeenCalled();
		expect(jobs[0].status).toBe('running');
	});
});

describe('listCurrentGroupForThread', () => {
	it.each(['completed', 'failed', 'cancelled'] as const)(
		'keeps a %s job until every job is terminal and its results are consumed',
		async (status) => {
			const { service, jobRepository } = setup();
			const finished = makeJob({
				status,
				createdAt: new Date(1000),
				settledAt: new Date(3000),
			});
			const running = makeJob({ id: 'job-2', createdAt: new Date(2000) });
			const list = jobRepository.findGroupCandidates.mockResolvedValue([running, finished]);
			expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([
				expect.objectContaining({ id: finished.id }),
				expect.objectContaining({ id: running.id }),
			]);
			expect(list).toHaveBeenCalledWith('agent-1', 'thread-1');
			const terminal = { ...running, status, settledAt: new Date(4000) };
			list.mockResolvedValue([finished, terminal]);
			expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([
				expect.objectContaining({ id: finished.id, status }),
				expect.objectContaining({ id: terminal.id, status }),
			]);
			list.mockResolvedValue(
				[finished, terminal].map((job) => ({ ...job, notifiedAt: new Date(5000) })),
			);
			expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([]);
		},
	);

	it('restores all overlapping jobs in the current group and excludes an earlier group', async () => {
		const { service, jobRepository } = setup();
		const earlier = makeJob({
			id: 'earlier',
			status: 'completed',
			createdAt: new Date(1000),
			settledAt: new Date(2000),
		});
		const first = makeJob({
			id: 'first',
			status: 'completed',
			createdAt: new Date(3000),
			settledAt: new Date(5000),
		});
		const second = makeJob({
			id: 'second',
			status: 'failed',
			createdAt: new Date(4000),
			settledAt: new Date(7000),
		});
		const running = makeWorkflowJob({ id: 'running', createdAt: new Date(6000) });
		jobRepository.findGroupCandidates.mockResolvedValue([running, earlier, second, first]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual(
			[first, second, running].map(({ id }) => expect.objectContaining({ id })),
		);
	});

	it('starts a fresh group after a gap with no running jobs', async () => {
		const { service, jobRepository } = setup();
		const finished = makeJob({
			status: 'completed',
			createdAt: new Date(1000),
			settledAt: new Date(2000),
		});
		const next = makeJob({ id: 'next', createdAt: new Date(3000) });
		jobRepository.findGroupCandidates.mockResolvedValue([finished, next]);
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([
			expect.objectContaining({ id: next.id }),
		]);
	});

	it('returns no group when the thread has no jobs', async () => {
		const { service } = setup();
		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toEqual([]);
	});
});

describe('result consumption updates', () => {
	it('broadcasts after a foreground turn consumes results', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		jobRepository.findById.mockResolvedValue(makeJob());
		jobRepository.markMailConsumed.mockResolvedValue(1);
		await service.markMailConsumed('thread-1', ['job-1']);
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
		expect(jobRepository.markMailConsumed.mock.invocationCallOrder[0]).toBeLessThan(
			updateBroadcaster.notifyBackgroundJobsUpdated.mock.invocationCallOrder[0],
		);
	});

	it('broadcasts after cancellation consumes results without a parent wake', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		const job = makeJob();
		jobRepository.findByParentThread.mockResolvedValue([job]);
		jobRepository.findById.mockResolvedValue(job);
		jobRepository.markMailConsumed.mockResolvedValue(1);
		service.registerAbortController(job.id, new AbortController());
		await service.cancel('thread-1', job.id);
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledTimes(2);
		expect(jobRepository.markMailConsumed.mock.invocationCallOrder[0]).toBeLessThan(
			updateBroadcaster.notifyBackgroundJobsUpdated.mock.invocationCallOrder[1],
		);
	});
});

describe('cancel', () => {
	it.each([false, true])(
		'retains paused tasks when the parent reply is cancelled (stale snapshot: %s)',
		async (staleSnapshot) => {
			const { service, jobRepository, checkpointStorage } = setup();
			const paused = makeJob({
				id: 'paused',
				status: 'paused',
				pauseRequestId: 'stop-1',
				childThreadId: 'paused-thread',
			});
			const jobs = [
				paused,
				...(['running', 'suspended'] as const).map((status) =>
					makeJob({ id: status, status, childThreadId: status }),
				),
			];
			jobRepository.findByParentThread.mockImplementation(async (_threadId, ids) => {
				if (ids) return jobs.filter((job) => ids.includes(job.id));
				return jobs.map((job) => ({
					...job,
					status: staleSnapshot && job.id === paused.id ? 'running' : job.status,
				}));
			});
			jobRepository.settleIfActive.mockImplementation(async (id, settlement, expected) => {
				const job = jobs.find((candidate) => candidate.id === id);
				if (!job || (expected && job.status !== expected.status)) return false;
				job.status = settlement.status;
				return true;
			});

			await service.cancelForParent('agent-1', 'thread-1', 'draft-chat:user-1');

			expect(jobs.map((job) => job.status)).toEqual(['paused', 'cancelled', 'cancelled']);
			expect(
				checkpointStorage.deleteDelegatedForThread.mock.calls.map(([, threadId]) => threadId),
			).toEqual(['running', 'suspended']);
			expect(await service.cancel('thread-1', paused.id)).toBe('cancelled');
			expect(paused.status).toBe('cancelled');
			expect(checkpointStorage.deleteDelegatedForThread).toHaveBeenLastCalledWith(
				'sub-1',
				'paused-thread',
			);
		},
	);

	it('aborts a resumed run on another main when a local handle still exists', async () => {
		const { service, jobRepository, publisher } = setup();
		const { service: resumedService } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		const controller = new AbortController();
		const resumedController = new AbortController();
		service.registerAbortController('job-1', controller);
		resumedService.registerAbortController('job-1', resumedController);
		publisher.publishCommand.mockImplementation(async (command) => {
			if (command.command === 'cancel-agent-background-job') {
				resumedService.handleCancelRelay(command.payload);
			}
		});

		const outcome = await service.cancel('thread-1', 'job-1');

		expect(outcome).toBe('cancelled');
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-1',
			{ status: 'cancelled' },
			undefined,
		);
		expect(jobRepository.markMailConsumed).toHaveBeenCalledWith('thread-1', ['job-1'], false);
		expect(controller.signal.aborted).toBe(true);
		expect(resumedController.signal.aborted).toBe(true);
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'cancel-agent-background-job',
			payload: { jobId: 'job-1' },
		});
	});

	it('stops the child and reports cancellation when marking the result as delivered fails', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		jobRepository.markMailConsumed.mockRejectedValue(new Error('database unavailable'));
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		expect(await service.cancel('thread-1', 'job-1')).toBe('cancelled');
		expect(controller.signal.aborted).toBe(true);
	});

	it('still reports cancelled when the pubsub relay fails — the row is already claimed', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		publisher.publishCommand.mockRejectedValue(new Error('redis down'));

		expect(await service.cancel('thread-1', 'job-1')).toBe('cancelled');
	});

	it('relays the abort via pubsub when the live handle is on another main', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);

		const outcome = await service.cancel('thread-1', 'job-1');

		expect(outcome).toBe('cancelled');
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'cancel-agent-background-job',
			payload: { jobId: 'job-1' },
		});
	});

	it('returns not-found for a job of another thread', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([]);

		expect(await service.cancel('thread-other', 'job-1')).toBe('not-found');
		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});

	it('returns already-settled when the claim loses', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		jobRepository.settleIfActive.mockResolvedValue(false);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		expect(await service.cancel('thread-1', 'job-1')).toBe('already-settled');
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-1',
			{ status: 'cancelled' },
			undefined,
		);
		expect(controller.signal.aborted).toBe(false);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});

describe('handleCancelRelay', () => {
	it('aborts the local handle of the relayed job and nothing else', () => {
		const { service } = setup();
		const target = new AbortController();
		const other = new AbortController();
		service.registerAbortController('job-1', target);
		service.registerAbortController('job-2', other);

		service.handleCancelRelay({ jobId: 'job-1' });

		expect(target.signal.aborted).toBe(true);
		expect(other.signal.aborted).toBe(false);
	});

	it('is a no-op on a main that never held the handle', () => {
		const { service } = setup();

		expect(() => service.handleCancelRelay({ jobId: 'job-unknown' })).not.toThrow();
	});
});

describe('reconcile', () => {
	it('prunes settled rows past the retention cutoff', async () => {
		const { service, jobRepository } = setup();

		await service.reconcile();

		const cutoff = jobRepository.deleteSettledBefore.mock.calls[0][0];
		const expected = Date.now() - SETTLED_JOB_RETENTION_MS;
		expect(cutoff.getTime()).toBeGreaterThan(expected - 5000);
		expect(cutoff.getTime()).toBeLessThanOrEqual(expected);
	});

	it('fails jobs past their timeout and aborts their live handles', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findActivePastTimeout.mockResolvedValue([makeJob()]);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		await service.reconcile();

		expect(controller.signal.aborted).toBe(true);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed', error: expect.stringContaining('Timed out') }),
			expect.objectContaining({ status: 'running', timeoutAt: expect.any(Date) }),
		);
	});

	it('still aborts a timed-out run and the rest of the batch when one settle write fails', async () => {
		const { service, jobRepository } = setup();
		const failing = makeJob({ id: 'job-1' });
		const next = makeJob({ id: 'job-2', childThreadId: 'child-thread-2' });
		jobRepository.findActivePastTimeout.mockResolvedValue([failing, next]);
		jobRepository.settleIfActive.mockRejectedValueOnce(new Error('db blip'));
		const failingController = new AbortController();
		const nextController = new AbortController();
		service.registerAbortController('job-1', failingController);
		service.registerAbortController('job-2', nextController);

		await service.reconcile();

		expect(failingController.signal.aborted).toBe(true);
		expect(nextController.signal.aborted).toBe(true);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-2',
			expect.objectContaining({ status: 'failed' }),
			expect.objectContaining({ status: 'running', timeoutAt: expect.any(Date) }),
		);
	});

	it('fails orphaned sub-agent jobs whose child run errored', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([makeJob()]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'error']]),
		);

		await service.reconcile();

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed' }),
			expect.objectContaining({ status: 'running', timeoutAt: expect.any(Date) }),
		);
	});

	it('leaves orphaned jobs alone while their child run is still running', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([makeJob()]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'running']]),
		);

		await service.reconcile();

		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});

	it('stops between timed-out rows once the run is told to abort', async () => {
		const { service, jobRepository } = setup();
		const first = makeJob({ id: 'job-1' });
		const second = makeJob({ id: 'job-2', childThreadId: 'child-thread-2' });
		jobRepository.findActivePastTimeout.mockResolvedValue([first, second]);
		const firstHandle = new AbortController();
		const secondHandle = new AbortController();
		service.registerAbortController('job-1', firstHandle);
		service.registerAbortController('job-2', secondHandle);
		const run = new AbortController();
		jobRepository.settleIfActive.mockImplementation(async () => {
			run.abort();
			return true;
		});

		await service.reconcile(run.signal);

		expect(jobRepository.settleIfActive).toHaveBeenCalledTimes(1);
		expect(firstHandle.signal.aborted).toBe(true);
		expect(secondHandle.signal.aborted).toBe(false);
	});

	it('stops between orphaned rows once the run is told to abort', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([
			makeJob({ id: 'job-1', childThreadId: 'child-thread-1' }),
			makeJob({ id: 'job-2', childThreadId: 'child-thread-2' }),
		]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([
				['child-thread-1', 'error'],
				['child-thread-2', 'error'],
			]),
		);
		const run = new AbortController();
		jobRepository.settleIfActive.mockImplementation(async () => {
			run.abort();
			return true;
		});

		await service.reconcile(run.signal);

		expect(jobRepository.settleIfActive).toHaveBeenCalledTimes(1);
	});

	it('stops between requested workflow stops once the run is told to abort', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([
			makeWorkflowJob({ id: 'wf-job-1', childExecutionId: null, pauseRequestId: 'stop-1' }),
			makeWorkflowJob({ id: 'wf-job-2', childExecutionId: null, pauseRequestId: 'stop-1' }),
		]);
		const run = new AbortController();
		jobRepository.settleIfActive.mockImplementation(async () => {
			run.abort();
			return true;
		});

		await service.reconcileWorkflowJobs(run.signal);

		expect(jobRepository.settleIfActive).toHaveBeenCalledTimes(1);
		expect(jobRepository.deleteSettledBefore).not.toHaveBeenCalled();
	});

	it('does nothing once the run is already aborted', async () => {
		const { service, jobRepository } = setup();
		const run = new AbortController();
		run.abort();

		await service.reconcile(run.signal);

		expect(jobRepository.findActivePastTimeout).not.toHaveBeenCalled();
		expect(jobRepository.deleteSettledBefore).not.toHaveBeenCalled();
	});
});

describe('registerWorkflowJob', () => {
	const workflowParams = {
		id: 'wf-job-1',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		parentResourceId: 'draft-chat:user-1',
		parentPrincipalHash: 'principal-hash',
		title: 'My Workflow',
		workflowId: 'workflow-1',
		executionId: 'exec-1',
	};

	it('registers a running workflow job keyed to its execution', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-job-1' });
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
		expect(jobRepository.insertWorkflowJobOrGetExisting).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'workflow',
				childExecutionId: 'exec-1',
				workflowId: 'workflow-1',
			}),
		);
		// No timeout: the execution's own lifecycle governs how long it may wait.
		expect(jobRepository.insertWorkflowJobOrGetExisting.mock.calls[0][0]).not.toHaveProperty(
			'timeoutAt',
		);
		expect(jobRepository.countActiveSubAgentsByParentThread).not.toHaveBeenCalled();
	});

	it('converges a replayed registration on the job already tracking the execution', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({
			inserted: false,
			existing: makeWorkflowJob({ id: 'wf-existing' }),
		});

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-existing' });
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).not.toHaveBeenCalled();
	});

	it('converges on the existing job even after it settled', async () => {
		const { service, jobRepository } = setup();
		jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({
			inserted: false,
			existing: makeWorkflowJob({ id: 'wf-settled', status: 'completed' }),
		});

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-settled' });
	});
});

describe('settleWorkflowJobByExecutionId', () => {
	it('retains partial progress when the workflow hook settles a selected cancellation', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningWorkflowJobByExecutionId.mockResolvedValue(
			makeWorkflowJob({ pauseRequestId: 'stop-1' }),
		);

		await service.settleWorkflowJobByExecutionId(
			'exec-1',
			{ status: 'cancelled', result: null },
			{
				Send: [{ data: { main: [[{ json: { sent: true } }]] } } as never],
				Wait: [{ data: { main: [[]] } } as never],
			},
		);

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			{
				status: 'cancelled',
				result: '{"Send":[{"sent":true}]}',
			},
			undefined,
		);
	});

	it('settles the running job tracking the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningWorkflowJobByExecutionId.mockResolvedValue(makeWorkflowJob());

		const settled = await service.settleWorkflowJobByExecutionId('exec-1', {
			status: 'completed',
			result: '{"Set":[{"ok":true}]}',
		});

		expect(settled).toBe(true);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			{
				status: 'completed',
				result: '{"Set":[{"ok":true}]}',
			},
			undefined,
		);
	});

	it('is a no-op when no running job tracks the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningWorkflowJobByExecutionId.mockResolvedValue(null);

		const settled = await service.settleWorkflowJobByExecutionId('exec-1', { status: 'failed' });

		expect(settled).toBe(false);
		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});
});

describe('cancel — workflow jobs', () => {
	afterEach(() => {
		Container.reset();
	});

	it('stops the execution, then claims the row', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob()]);
		const executionService = mock<ExecutionService>();
		Container.set(ExecutionService, executionService);

		const outcome = await service.cancel('thread-1', 'wf-job-1');

		expect(outcome).toBe('cancelled');
		expect(executionService.stop).toHaveBeenCalledWith('exec-1', ['workflow-1']);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith('wf-job-1', {
			status: 'cancelled',
		});
		expect(executionService.stop.mock.invocationCallOrder[0]).toBeLessThan(
			jobRepository.settleIfActive.mock.invocationCallOrder[0],
		);
	});

	it('reports already-settled and leaves the row to reconciliation when the execution already finished', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob()]);
		const executionService = mock<ExecutionService>();
		executionService.stop.mockRejectedValue(new WorkflowOperationError('already finished'));
		Container.set(ExecutionService, executionService);

		expect(await service.cancel('thread-1', 'wf-job-1')).toBe('already-settled');
		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});

	it('logs and rethrows an unexpected stop failure with the row still running', async () => {
		const { service, jobRepository, logger } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob()]);
		const executionService = mock<ExecutionService>();
		executionService.stop.mockRejectedValue(new Error('db down'));
		Container.set(ExecutionService, executionService);

		await expect(service.cancel('thread-1', 'wf-job-1')).rejects.toThrow('db down');
		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining('may still be running'),
			expect.objectContaining({ jobId: 'wf-job-1', executionId: 'exec-1', error: 'db down' }),
		);
	});

	it('reports already-settled for a row that is no longer running', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob({ status: 'completed' })]);
		const executionService = mock<ExecutionService>();
		Container.set(ExecutionService, executionService);

		expect(await service.cancel('thread-1', 'wf-job-1')).toBe('already-settled');
		expect(executionService.stop).not.toHaveBeenCalled();
	});

	it('claims a row that lost its execution id without attempting a stop', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([
			makeWorkflowJob({ childExecutionId: null }),
		]);
		const executionService = mock<ExecutionService>();
		Container.set(ExecutionService, executionService);

		const outcome = await service.cancel('thread-1', 'wf-job-1');

		expect(outcome).toBe('cancelled');
		expect(executionService.stop).not.toHaveBeenCalled();
	});
});

describe('reconcile — workflow jobs', () => {
	afterEach(() => Container.reset());

	it('retries persisted workflow stops after restart even with background tasks disabled', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		const jobs = [
			makeWorkflowJob({ pauseRequestId: 'stop-1' }),
			makeWorkflowJob({ id: 'wf-job-2', childExecutionId: 'exec-2', pauseRequestId: 'stop-1' }),
			makeWorkflowJob({ id: 'other-job', childExecutionId: 'other-execution' }),
		];
		jobRepository.findRunningJobs.mockResolvedValue(jobs);
		executionPersistence.findStatusesByIds.mockResolvedValue(
			jobs.map((job) => ({ id: job.childExecutionId!, status: 'waiting' })),
		);
		const executionService = mock<ExecutionService>();
		executionService.stop.mockRejectedValueOnce(new Error('Worker unavailable'));
		Container.set(ExecutionService, executionService);

		await service.reconcileWorkflowJobs();

		expect(executionService.stop.mock.calls).toEqual([
			['exec-1', ['workflow-1']],
			['exec-2', ['workflow-1']],
		]);
		expect(jobRepository.settleIfActive).toHaveBeenCalledExactlyOnceWith(
			'wf-job-2',
			{ status: 'cancelled', result: null },
			undefined,
		);
		expect(jobRepository.markMailConsumed).not.toHaveBeenCalled();
	});

	it('settles a job whose execution already reached a terminal state, carrying its output', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'success' }]);
		executionPersistence.findSingleExecution.mockResolvedValue({
			status: 'success',
			data: {
				resultData: { runData: { Set: [{ data: { main: [[{ json: { ok: true } }]] } }] } },
			},
		} as never);

		await service.reconcile();

		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledTimes(1);
		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledWith(['exec-1']);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'completed', result: '{"Set":[{"ok":true}]}' }),
			undefined,
		);
	});

	it('fails a job whose execution no longer exists, saying the outcome is unknown', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([]);

		await service.reconcile();

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({
				status: 'failed',
				error: expect.stringContaining('outcome is unknown'),
			}),
			undefined,
		);
	});

	it('settles with a null result when the finished execution’s data cannot be read', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'success' }]);
		executionPersistence.findSingleExecution.mockRejectedValue(new Error('data bundle unreadable'));

		await service.reconcile();

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'completed', result: null }),
			undefined,
		);
	});

	it('reads all candidate statuses in one batch and settles the rest when one settle fails', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow'
				? [makeWorkflowJob(), makeWorkflowJob({ id: 'wf-job-2', childExecutionId: 'exec-2' })]
				: [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([
			{ id: 'exec-1', status: 'error' },
			{ id: 'exec-2', status: 'error' },
		]);
		jobRepository.settleIfActive.mockImplementation(async (id) => {
			if (id === 'wf-job-1') throw new Error('db down');
			return true;
		});

		await service.reconcile();

		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledWith(['exec-1', 'exec-2']);
		expect(jobRepository.settleIfActive).toHaveBeenCalledTimes(2);
		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-2',
			expect.objectContaining({ status: 'failed' }),
			undefined,
		);
	});

	it('settles nothing when the batched status read fails', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockRejectedValue(new Error('db down'));

		await service.reconcile();

		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});

	it('leaves a still-waiting execution alone — workflow jobs have no timeout', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'waiting' }]);

		await service.reconcile();

		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
	});
});

describe('listForThread — workflow jobs', () => {
	it('settles a running workflow row whose execution finished (settle-on-check)', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findByParentThread
			.mockResolvedValueOnce([makeWorkflowJob()])
			.mockResolvedValueOnce([makeWorkflowJob({ status: 'cancelled' })]);
		executionPersistence.findStatusesByIds.mockResolvedValue([
			{ id: 'exec-1', status: 'canceled' },
		]);

		const jobs = await service.listForThread('thread-1');

		expect(jobRepository.settleIfActive).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'cancelled' }),
			undefined,
		);
		expect(jobs[0].status).toBe('cancelled');
		expect(jobs[0].childExecutionId).toBe('exec-1');
	});
});

describe('settlementStatusForExecution', () => {
	it('maps terminal execution statuses onto job settlement statuses', () => {
		expect(settlementStatusForExecution('success')).toBe('completed');
		expect(settlementStatusForExecution('canceled')).toBe('cancelled');
		expect(settlementStatusForExecution('error')).toBe('failed');
		expect(settlementStatusForExecution('crashed')).toBe('failed');
	});
});

describe('serializeWorkflowJobResult', () => {
	it('serializes result data and bounds its size', () => {
		expect(serializeWorkflowJobResult(undefined)).toBeNull();
		expect(serializeWorkflowJobResult({})).toBeNull();
		expect(serializeWorkflowJobResult({ Set: [{ ok: true }] })).toBe('{"Set":[{"ok":true}]}');

		const oversized = serializeWorkflowJobResult({ Set: ['x'.repeat(20_000)] });
		expect(oversized?.length).toBeLessThan(WORKFLOW_JOB_RESULT_MAX_CHARS + 100);
		expect(oversized).toContain('truncated');
	});

	it('truncates exactly at the cap and leaves a result at the cap untouched', () => {
		const atCap = { S: 'x'.repeat(WORKFLOW_JOB_RESULT_MAX_CHARS - '{"S":""}'.length) };
		const atCapSerialized = JSON.stringify(atCap);
		expect(atCapSerialized.length).toBe(WORKFLOW_JOB_RESULT_MAX_CHARS);
		expect(serializeWorkflowJobResult(atCap)).toBe(atCapSerialized);

		const overCap = { S: 'x'.repeat(WORKFLOW_JOB_RESULT_MAX_CHARS) };
		const overCapSerialized = JSON.stringify(overCap);
		expect(serializeWorkflowJobResult(overCap)).toBe(
			`${overCapSerialized.slice(0, WORKFLOW_JOB_RESULT_MAX_CHARS)}… [truncated, full data on execution]`,
		);
	});
});

describe('background task update failures', () => {
	afterEach(() => Container.reset());

	it('reads orphan candidates without reconciliation or notifications', async () => {
		const { service, jobRepository, executionRepository, executionPersistence, updateBroadcaster } =
			setup({ backgroundTasksEnabled: true });
		const wake = mock<AgentWakeService>();
		Container.set(AgentWakeService, wake);
		jobRepository.findGroupCandidates.mockResolvedValue([makeJob(), makeWorkflowJob()]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'error']]),
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'success' }]);

		expect(await service.listCurrentGroupForThread('agent-1', 'thread-1')).toHaveLength(2);
		expect(executionRepository.findLatestStatusesByThreadIds).not.toHaveBeenCalled();
		expect(executionPersistence.findStatusesByIds).not.toHaveBeenCalled();
		expect(jobRepository.settleIfActive).not.toHaveBeenCalled();
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).not.toHaveBeenCalled();
		expect(wake.requestWake).not.toHaveBeenCalled();
	});

	it('uses the start time when a terminal job has no settlement time and orders ties by ID', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findGroupCandidates.mockResolvedValue([
			makeJob({ id: 'b', createdAt: new Date(1000), status: 'completed' }),
			makeJob({ id: 'a', createdAt: new Date(1000), status: 'failed' }),
		]);
		expect(
			(await service.listCurrentGroupForThread('agent-1', 'thread-1')).map(({ id }) => id),
		).toEqual(['a', 'b']);
		jobRepository.findGroupCandidates.mockResolvedValue([
			makeJob({ id: 'a', createdAt: new Date(1000), status: 'completed' }),
			makeJob({ id: 'b', createdAt: new Date(2000), status: 'completed' }),
		]);
		expect(
			(await service.listCurrentGroupForThread('agent-1', 'thread-1')).map(({ id }) => id),
		).toEqual(['b']);
	});

	it('preserves settlement when the job lookup fails', async () => {
		const { service, jobRepository, updateBroadcaster } = setup({ backgroundTasksEnabled: true });
		const wake = mock<AgentWakeService>();
		Container.set(AgentWakeService, wake);
		jobRepository.findById.mockRejectedValue(new Error('lookup failed'));
		await expect(service.settle('job-1', { status: 'completed' })).resolves.toBe(true);
		expect(jobRepository.findById).toHaveBeenCalledOnce();
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).not.toHaveBeenCalled();
		expect(wake.requestWake).not.toHaveBeenCalled();
	});

	it('requests a wake when notification fails after a successful lookup', async () => {
		const { service, jobRepository, updateBroadcaster } = setup({ backgroundTasksEnabled: true });
		const wake = mock<AgentWakeService>();
		Container.set(AgentWakeService, wake);
		jobRepository.findById.mockResolvedValue(makeJob());
		updateBroadcaster.notifyBackgroundJobsUpdated.mockImplementation(() => {
			throw new Error('notification failed');
		});
		await expect(service.settle('job-1', { status: 'completed' })).resolves.toBe(true);
		expect(jobRepository.findById).toHaveBeenCalledOnce();
		expect(wake.requestWake).toHaveBeenCalledWith('thread-1');
	});

	it('skips notification when no results are consumed', async () => {
		const { service, jobRepository, updateBroadcaster } = setup();
		jobRepository.markMailConsumed.mockResolvedValue(0);
		await expect(service.markMailConsumed('thread-1', ['job-1'])).resolves.toBe(0);
		expect(jobRepository.findById).not.toHaveBeenCalled();
		expect(updateBroadcaster.notifyBackgroundJobsUpdated).not.toHaveBeenCalled();
	});

	it.each(['success', 'zero', 'consume-error', 'lookup-error'] as const)(
		'notifies workflow cancellation when consumption has outcome %s',
		async (outcome) => {
			const { service, jobRepository, updateBroadcaster } = setup();
			const job = makeWorkflowJob();
			Container.set(ExecutionService, mock<ExecutionService>());
			jobRepository.findByParentThread.mockResolvedValue([job]);
			jobRepository.findById.mockResolvedValue(job);
			jobRepository.markMailConsumed.mockResolvedValue(outcome === 'zero' ? 0 : 1);
			if (outcome === 'consume-error')
				jobRepository.markMailConsumed.mockRejectedValue(new Error('consume failed'));
			if (outcome === 'lookup-error')
				jobRepository.findById.mockRejectedValue(new Error('lookup failed'));
			await expect(service.cancel('thread-1', job.id)).resolves.toBe('cancelled');
			expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledWith(
				'agent-1',
				'thread-1',
			);
			expect(updateBroadcaster.notifyBackgroundJobsUpdated).toHaveBeenCalledTimes(
				outcome === 'success' ? 2 : 1,
			);
		},
	);
});
