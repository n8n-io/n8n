import { AgentPlanValidationError } from '../../plans/agent-plan.schema';
import { randomUUID } from 'node:crypto';
import { PLAN_TASK_METADATA_KEY } from '../../plans/agent-plan-task-context';
import type { CredentialProvider } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';
import type { ZodTypeAny } from 'zod';

import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentBackgroundJobService, BackgroundJobView } from '../agent-background-job.service';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import { EXECUTION_METADATA_KEY } from '../../types/agent-queued-message';
import {
	createBackgroundJobsTool,
	createBackgroundSubAgentHandler,
	type BackgroundJobToolsOptions,
} from '../background-job-tools';
import type { SubAgentBackgroundRunner } from '../sub-agent-background-runner';
import { createN8nDelegateSubAgentTool } from '../../sub-agents/delegate-sub-agent-tool';
import type { SubAgentRunner } from '../../sub-agents/sub-agent-runner';
import {
	BACKGROUND_PAUSE_USER_TURN_KEY,
	PARENT_TASK_CANCELLED_REASON,
} from '../sub-agent-background-state';

const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
const persistence = {
	threadId: 'thread-1',
	resourceId: 'resource-1',
	hostMetadata: encodeAgentSandboxHostMetadata({ projectId: 'project-1', principalHash }),
};

function jobView(overrides: Partial<BackgroundJobView> = {}): BackgroundJobView {
	return {
		planId: null,
		planTaskId: null,
		id: 'job-1',
		kind: 'subagent',
		title: 'research',
		status: 'running',
		result: null,
		error: null,
		files: null,
		skippedFiles: null,
		createdAt: new Date('2026-08-26T10:00:00Z'),
		timeoutAt: null,
		settledAt: null,
		notifiedAt: null,
		pauseRequestId: null,
		childExecutionId: null,
		...overrides,
	};
}

function setup() {
	const jobService = mock<AgentBackgroundJobService>();
	const backgroundRunner = mock<SubAgentBackgroundRunner>();
	const options: BackgroundJobToolsOptions = {
		jobService,
		backgroundRunner,
		sourcesById: { 'sub-1': { agentId: 'sub-1' } },
		availableSubAgents: [{ id: 'sub-1', name: 'Researcher' }],
		projectId: 'project-1',
		parentAgentId: 'agent-1',
		runContext: { credentialProvider: mock<CredentialProvider>(), runType: 'production' },
	};
	return { jobService, backgroundRunner, options };
}

function createBackgroundDelegateTool(options: BackgroundJobToolsOptions) {
	return createN8nDelegateSubAgentTool({
		...options.runContext,
		runner: mock<SubAgentRunner>(),
		sourcesById: options.sourcesById,
		availableSubAgents: options.availableSubAgents,
		projectId: options.projectId,
		parentAgentId: options.parentAgentId,
		runBackgroundSubAgent: createBackgroundSubAgentHandler(options),
	});
}

describe('delegate_subagent background mode', () => {
	it('returns a recoverable task-reference error without dispatching replacement work', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockRejectedValue(new AgentPlanValidationError('Read the plan again.'));
		const tool = createBackgroundDelegateTool(options);

		expect(
			await tool.handler!(
				{ mode: 'background', subAgentId: 'sub-1', taskName: 'Research', goal: 'Research' },
				{ persistence },
			),
		).toEqual({ status: 'rejected', note: 'Read the plan again.' });
		expect(backgroundRunner.spawn).toHaveBeenCalledTimes(1);
	});

	it('uses the inherited task instead of a descendant override', async () => {
		const { backgroundRunner, options } = setup();
		const inherited = { planId: randomUUID(), planTaskId: randomUUID() };
		const override = { planId: randomUUID(), planTaskId: randomUUID() };
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'sub-1',
				taskName: 'Research',
				goal: 'Research',
				planTask: override,
			},
			{
				persistence: {
					...persistence,
					hostMetadata: { ...persistence.hostMetadata, [PLAN_TASK_METADATA_KEY]: inherited },
				},
			},
		);

		expect(backgroundRunner.spawn).toHaveBeenCalledWith(
			expect.objectContaining({ planTask: inherited, inheritedPlanTask: true }),
			expect.anything(),
		);
	});

	it.each([
		[true, true],
		[false, false],
	])('forwards a model task reference only with plan tasks enabled: %s', async (enabled, sent) => {
		const { backgroundRunner, options } = setup();
		const planTask = { planId: randomUUID(), planTaskId: randomUUID() };
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool({ ...options, planTasksEnabled: enabled });

		const receipt = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'Research', goal: 'Research', planTask },
			{ persistence },
		);

		expect(backgroundRunner.spawn).toHaveBeenCalledWith(
			expect.objectContaining({ planTask: sent ? planTask : undefined }),
			expect.anything(),
		);
		expect(receipt).toMatchObject({ status: 'started', planTask: sent ? planTask : undefined });
	});

	it.each(['execution-1', 42, undefined])(
		'forwards string source execution metadata: %s',
		async (id) => {
			const { backgroundRunner, options } = setup();
			backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
			const tool = createBackgroundDelegateTool(options);

			await tool.handler!(
				{ mode: 'background', subAgentId: 'sub-1', taskName: 'Research', goal: 'Research' },
				{
					persistence: {
						...persistence,
						hostMetadata: { ...persistence.hostMetadata, [EXECUTION_METADATA_KEY]: id },
					},
				} as never,
			);

			expect(backgroundRunner.spawn).toHaveBeenCalledWith(
				expect.objectContaining({ sourceExecutionId: typeof id === 'string' ? id : undefined }),
				expect.anything(),
			);
		},
	);

	it.each([255, 256])('enforces the stored job title limit (%s characters)', async (length) => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'a'.repeat(length), goal: 'Research' },
			{ persistence },
		);

		if (length === 255) {
			expect(output).toMatchObject({ status: 'started', jobId: 'job-1' });
		} else {
			expect(output).toMatchObject({ status: 'rejected' });
			expect(backgroundRunner.spawn).not.toHaveBeenCalled();
		}
	});

	it.each([true, false])(
		'handles a Stop during registration without treating disconnects as cancellation (%s)',
		async (stop) => {
			const { backgroundRunner, jobService, options } = setup();
			const controller = new AbortController();
			backgroundRunner.spawn.mockImplementation(async () => {
				controller.abort(stop ? PARENT_TASK_CANCELLED_REASON : new Error('Connection closed'));
				return { status: 'started', jobId: 'job-1' };
			});
			const tool = createBackgroundDelegateTool(options);
			await tool.handler!(
				{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
				{ persistence, abortSignal: controller.signal },
			);
			if (stop) expect(jobService.cancel).toHaveBeenCalledWith('thread-1', 'job-1');
			else expect(jobService.cancel).not.toHaveBeenCalled();
		},
	);

	it('reads the parent thread and execution from ctx.persistence at call time', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{
				persistence: {
					...persistence,
					hostMetadata: { ...persistence.hostMetadata, [EXECUTION_METADATA_KEY]: 'execution-1' },
				},
			},
		);

		expect(output).toMatchObject({ status: 'started', jobId: 'job-1' });
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			parentThreadId: 'thread-1',
			sourceExecutionId: 'execution-1',
			parentResourceId: 'resource-1',
		});
	});

	it('rejects background jobs in task sessions', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{ persistence: { ...persistence, resourceId: 'task:task-1' } },
		);

		expect(output).toMatchObject({ status: 'rejected' });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('passes files to the background sub-agent', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'sub-1',
				taskName: 'research',
				goal: 'find things',
				fileIds: ['file-1'],
			},
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'started' });
		expect(backgroundRunner.spawn).toHaveBeenCalledWith(
			expect.objectContaining({ fileIds: ['file-1'] }),
			expect.anything(),
		);
	});

	it('rejects when the thread carries no host metadata', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{ persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		);

		expect(output).toMatchObject({ status: 'rejected' });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('rejects when no persisted thread is active', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{},
		);

		expect(output).toMatchObject({ status: 'rejected' });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('rejects unknown sub-agent ids listing the available ones', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'nope', taskName: 'research', goal: 'find things' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'rejected', note: expect.stringContaining('sub-1') });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('forwards context and expectedOutput to the spawn request', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'sub-1',
				taskName: 'research',
				goal: 'find things',
				context: 'background info',
				expectedOutput: 'a list',
			},
			{ persistence },
		);

		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			context: 'background info',
			expectedOutput: 'a list',
		});
	});

	it('forwards the parent execution id so the child execution links to the dispatching turn', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);
		const input = {
			mode: 'background',
			subAgentId: 'sub-1',
			taskName: 'research',
			goal: 'find things',
		};

		await tool.handler!(input, {
			persistence: {
				...persistence,
				hostMetadata: { ...persistence.hostMetadata, n8nExecutionId: 'turn-1' },
			},
		});
		await tool.handler!(input, { persistence });

		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({ parentExecutionId: 'turn-1' });
		expect(backgroundRunner.spawn.mock.calls[1][0]).not.toHaveProperty('parentExecutionId');
	});

	it('forwards the sandbox principal when the host scope matches the project', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);
		const input = {
			mode: 'background',
			subAgentId: 'sub-1',
			taskName: 'research',
			goal: 'find things',
		};

		await tool.handler!(input, {
			persistence: {
				...persistence,
				hostMetadata: encodeAgentSandboxHostMetadata({ projectId: 'project-1', principalHash }),
			},
		});
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			parentSandboxPrincipalHash: principalHash,
		});

		const rejected = await tool.handler!(input, {
			persistence: {
				...persistence,
				hostMetadata: encodeAgentSandboxHostMetadata({ projectId: 'project-other', principalHash }),
			},
		});
		expect(rejected).toMatchObject({ status: 'rejected' });
		expect(backgroundRunner.spawn).toHaveBeenCalledTimes(1);
	});

	it('spawns a copy of the parent for inline self-delegation, with its difficulty', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'inline',
				taskName: 'research',
				goal: 'find things',
				difficulty: 'high',
			},
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'started', jobId: 'job-1' });
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			subAgentId: 'agent-1',
			source: { agentId: 'agent-1' },
			difficulty: 'high',
		});
	});

	it('binds an inline background job to the plan task from the model input', async () => {
		const { backgroundRunner, options } = setup();
		const planTask = { planId: randomUUID(), planTaskId: randomUUID() };
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool({ ...options, planTasksEnabled: true });

		const output = await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'inline',
				taskName: 'Research suppliers',
				goal: 'Research suppliers and produce a comparison report.',
				planTask,
			},
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'started', jobId: 'job-1', planTask });
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			subAgentId: 'agent-1',
			source: { agentId: 'agent-1' },
			planTask,
			validatePlanTask: true,
			inheritedPlanTask: false,
			taskName: 'Research suppliers',
			goal: 'Research suppliers and produce a comparison report.',
		});
	});

	it('ignores difficulty for configured sub-agents — it only applies to self-delegation', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createBackgroundDelegateTool(options);

		await tool.handler!(
			{
				mode: 'background',
				subAgentId: 'sub-1',
				taskName: 'research',
				goal: 'find things',
				difficulty: 'high',
			},
			{ persistence },
		);

		expect(backgroundRunner.spawn.mock.calls[0][0]).not.toHaveProperty('difficulty');
	});

	it('echoes a limit-reached receipt in the tool output', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'limit-reached' });
		const tool = createBackgroundDelegateTool(options);

		const output = await tool.handler!(
			{ mode: 'background', subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'limit-reached' });
	});
});

describe('background_jobs input', () => {
	const { options } = setup();
	const schema = createBackgroundJobsTool(options).inputSchema as ZodTypeAny;
	const planId = randomUUID();

	it.each([
		[{ action: 'check' }, true],
		[{ action: 'check', jobIds: ['job-1'] }, true],
		[{ action: 'cancel', jobId: 'job-1' }, true],
		[{ action: 'cancel' }, false],
		[{ action: 'resume' }, true],
		[{ action: 'resume', planId, planTaskIds: [randomUUID()] }, true],
		[{ action: 'resume', planTaskIds: [randomUUID()] }, false],
		[{ action: 'resume', planId, planTaskIds: [] }, false],
		[{}, false],
	])('validates %j: %s', (input, valid) => {
		expect(schema.safeParse(input).success).toBe(valid);
	});
});

describe('background_jobs check', () => {
	it('lists only jobs of the calling thread', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView(),
			jobView({ id: 'job-2', status: 'completed', result: 'the answer' }),
		]);
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'check' }, { persistence });

		expect(jobService.listForThread).toHaveBeenCalledWith('thread-1', undefined);
		expect(output).toMatchObject({
			runningCount: 1,
			jobs: [
				expect.objectContaining({ jobId: 'job-1', status: 'running' }),
				expect.objectContaining({ jobId: 'job-2', result: 'the answer' }),
			],
		});
	});

	it('surfaces a workflow job’s execution id', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView({ kind: 'workflow', childExecutionId: 'exec-1' }),
		]);
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'check' }, { persistence });

		expect(output).toMatchObject({
			jobs: [expect.objectContaining({ executionId: 'exec-1' })],
		});
	});

	it('lists the output files of a job', async () => {
		const { jobService, options } = setup();
		const file = { fileId: 'file-1', fileName: 'chart.png', mimeType: 'image/png', sizeBytes: 3 };
		jobService.listForThread.mockResolvedValue([
			jobView({
				kind: 'workflow',
				status: 'completed',
				files: [file],
				skippedFiles: [{ fileName: 'video.mp4', reason: 'The file is larger than 50 MB.' }],
			}),
			jobView({ id: 'job-2' }),
		]);
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'check' }, { persistence });

		expect(output).toMatchObject({
			jobs: [
				expect.objectContaining({
					files: [file],
					skippedFiles: [{ fileName: 'video.mp4', reason: 'The file is larger than 50 MB.' }],
				}),
				expect.anything(),
			],
		});
		expect(output).toMatchObject({
			jobs: [
				{},
				expect.not.objectContaining({
					files: expect.anything(),
					skippedFiles: expect.anything(),
				}),
			],
		});
	});

	it('marks only the returned settled jobs as delivered', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView(),
			jobView({ id: 'job-2', status: 'completed', settledAt: new Date() }),
			jobView({ id: 'job-3', status: 'failed', settledAt: new Date() }),
		]);
		const tool = createBackgroundJobsTool(options);

		await tool.handler!({ action: 'check' }, { persistence });

		expect(jobService.markMailConsumed).toHaveBeenCalledWith('thread-1', ['job-2', 'job-3']);
	});

	it('truncates oversized results in the echo', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView({ status: 'completed', result: 'x'.repeat(10_000) }),
		]);
		const tool = createBackgroundJobsTool(options);

		const output = (await tool.handler!({ action: 'check' }, { persistence })) as {
			jobs: Array<{ result: string }>;
		};

		expect(output.jobs[0].result.length).toBeLessThan(10_000);
		expect(output.jobs[0].result).toContain('truncated');
	});

	it('truncates oversized errors in the echo', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView({ status: 'failed', error: 'x'.repeat(10_000) }),
		]);
		const tool = createBackgroundJobsTool(options);

		const output = (await tool.handler!({ action: 'check' }, { persistence })) as {
			jobs: Array<{ error: string }>;
		};

		expect(output.jobs[0].error.length).toBeLessThan(10_000);
		expect(output.jobs[0].error).toContain('truncated');
	});

	it('returns an empty listing when no persisted thread is active', async () => {
		const { jobService, options } = setup();
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'check' }, {});

		expect(output).toMatchObject({ jobs: [], note: expect.stringContaining('No persisted') });
		expect(jobService.listForThread).not.toHaveBeenCalled();
	});
});

describe('background_jobs resume', () => {
	it('passes only the requested plan tasks and finalizes their outcome', async () => {
		const { options, jobService } = setup();
		const planId = randomUUID();
		const taskIds = [randomUUID()];
		const selection = { planId, taskIds, stopId: randomUUID() };
		const tool = createBackgroundJobsTool(options);
		jobService.preparePausedResume.mockResolvedValue({
			status: 'ready',
			jobs: [],
			timeoutAt: new Date(),
			workflowsToRestart: [],
			selection,
			blocked: [],
			failed: [],
		});
		const userPersistence = {
			...persistence,
			hostMetadata: {
				...persistence.hostMetadata,
				[BACKGROUND_PAUSE_USER_TURN_KEY]: true,
				[EXECUTION_METADATA_KEY]: 'execution-1',
			},
		};

		await tool.handler!(
			{ action: 'resume', planId, planTaskIds: taskIds },
			{ persistence: userPersistence },
		);

		expect(jobService.preparePausedResume).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
			'resource-1',
			'execution-1',
			{ planId, taskIds },
		);
		expect(jobService.finishPlanResume).toHaveBeenCalledWith('agent-1', 'thread-1', selection);
	});

	it('requires a user turn, rejects early continuation, and reports each admitted resume', async () => {
		const { options, jobService, backgroundRunner } = setup();
		const tool = createBackgroundJobsTool(options);
		expect(await tool.handler!({ action: 'resume' }, { persistence })).toMatchObject({
			status: 'unavailable',
		});
		expect(jobService.preparePausedResume).not.toHaveBeenCalled();
		const userPersistence = {
			...persistence,
			hostMetadata: {
				...persistence.hostMetadata,
				[BACKGROUND_PAUSE_USER_TURN_KEY]: true,
				[EXECUTION_METADATA_KEY]: 'execution-1',
			},
		};
		for (const status of ['stopping', 'limit-reached', 'expired'] as const) {
			jobService.preparePausedResume.mockResolvedValue({ status, jobs: [] });
			expect(
				await tool.handler!({ action: 'resume' }, { persistence: userPersistence }),
			).toMatchObject({ status });
		}
		expect(backgroundRunner.resumePaused).not.toHaveBeenCalled();
		expect(jobService.releaseResumeReservations).not.toHaveBeenCalled();
		const jobs = [
			mock<AgentBackgroundJob>({ id: 'job-1' }),
			mock<AgentBackgroundJob>({ id: 'job-2' }),
		];
		const timeoutAt = new Date(Date.now() + 60_000);
		const workflowsToRestart = [
			{
				jobId: 'workflow-job',
				title: 'Send request',
				workflowId: 'workflow-1',
				previousExecutionId: 'execution-1',
			},
		];
		jobService.preparePausedResume.mockResolvedValue({
			status: 'ready',
			jobs,
			timeoutAt,
			workflowsToRestart,
		});
		backgroundRunner.resumePaused
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('checkpoint has expired'));

		expect(
			await tool.handler!({ action: 'resume' }, { persistence: userPersistence }),
		).toMatchObject({
			status: 'partial',
			jobs: [
				{ jobId: 'job-1', status: 'resumed' },
				{
					jobId: 'job-2',
					status: 'failed',
					error: expect.stringContaining('checkpoint has expired'),
				},
			],
			workflowsToRestart,
		});
		expect(jobService.preparePausedResume).toHaveBeenLastCalledWith(
			'agent-1',
			'thread-1',
			'resource-1',
			'execution-1',
			undefined,
		);
		expect(backgroundRunner.resumePaused).toHaveBeenCalledTimes(2);
		expect(jobService.releaseResumeReservations).toHaveBeenCalledWith(jobs, timeoutAt);
		backgroundRunner.resumePaused.mockClear();
		jobService.preparePausedResume.mockResolvedValue({
			status: 'ready',
			jobs: [],
			timeoutAt,
			workflowsToRestart,
		});
		expect(
			await tool.handler!({ action: 'resume' }, { persistence: userPersistence }),
		).toMatchObject({
			status: 'ready',
			jobs: [],
			workflowsToRestart,
		});
		expect(backgroundRunner.resumePaused).not.toHaveBeenCalled();
	});
});

describe('background_jobs cancel', () => {
	it('cancels within the calling thread only', async () => {
		const { jobService, options } = setup();
		jobService.cancel.mockResolvedValue('cancelled');
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'cancel', jobId: 'job-1' }, { persistence });

		expect(jobService.cancel).toHaveBeenCalledWith('thread-1', 'job-1');
		expect(output).toEqual({ status: 'cancelled' });
	});

	it('returns not-found without cancelling when no persisted thread is active', async () => {
		const { jobService, options } = setup();
		const tool = createBackgroundJobsTool(options);

		const output = await tool.handler!({ action: 'cancel', jobId: 'job-1' }, {});

		expect(output).toEqual({ status: 'not-found' });
		expect(jobService.cancel).not.toHaveBeenCalled();
	});
});
