import {
	assertSubAgentTaskPath,
	type CredentialProvider,
	type SerializableAgentState,
} from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import { hashAgentSandboxPrincipal } from '../../agent-sandbox-principal';
import type { AgentWorkspaceService } from '../../agent-workspace.service';
import type { AgentSandboxRuntime } from '../../agent-sandbox-runtime.service';
import type { SubAgentRunner, SubAgentRunResult } from '../../sub-agents/sub-agent-runner';
import type { AgentBackgroundJobService } from '../agent-background-job.service';
import { SUB_AGENT_BACKGROUND_TIMEOUT_MS } from '../agent-background-job.service';
import {
	SubAgentBackgroundRunner,
	type BackgroundSpawnRequest,
} from '../sub-agent-background-runner';

function completedRunResult(overrides: Partial<SubAgentRunResult> = {}): SubAgentRunResult {
	return {
		taskPath: '/root/research_0',
		threadId: 'child-thread-1',
		status: 'completed',
		result: {
			runId: 'run-1',
			messages: [{ role: 'assistant', content: [{ type: 'text', text: 'the answer' }] }],
			getState: () => ({}),
		},
		...overrides,
	} as SubAgentRunResult;
}

const request: BackgroundSpawnRequest = {
	subAgentId: 'sub-1',
	source: { agentId: 'sub-1' },
	taskName: 'research',
	goal: 'find things',
	parentThreadId: 'thread-1',
	parentResourceId: 'resource-1',
	parentSandboxPrincipalHash: 'principal-hash',
};

function setup() {
	const runner = mock<SubAgentRunner>();
	const jobService = mock<AgentBackgroundJobService>();
	const logger = mock<Logger>();
	(logger.scoped as Mock).mockReturnValue(logger);

	jobService.registerSubAgentJob.mockImplementation(async ({ id }) => ({
		status: 'started',
		jobId: id,
	}));
	jobService.settle.mockResolvedValue(true);
	runner.run.mockResolvedValue(completedRunResult());

	const jobRepository = mock<AgentBackgroundJobRepository>();
	jobRepository.findById.mockResolvedValue(
		mock<AgentBackgroundJob>({
			status: 'running',
			timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		}),
	);
	const workspaceService = mock<AgentWorkspaceService>();
	const backgroundRunner = new SubAgentBackgroundRunner(
		runner,
		jobService,
		logger,
		jobRepository,
		workspaceService,
	);
	const context = {
		projectId: 'project-1',
		parentAgentId: 'agent-1',
		credentialProvider: mock<CredentialProvider>(),
		runType: 'production' as const,
	};
	return { backgroundRunner, runner, jobService, context, jobRepository, workspaceService };
}

async function flushDetachedRun() {
	// The run is fire-and-forget; a macrotask boundary drains the whole nested
	// microtask chain (nextTick would leave later reactions queued behind us).
	await new Promise((resolve) => setImmediate(resolve));
}

describe('resumePaused', () => {
	const reservationTimeoutAt = new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS);
	const job = mock<AgentBackgroundJob>({
		id: 'job-1',
		status: 'paused',
		pauseRequestId: 'stop-1',
		notifiedAt: new Date(),
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		subAgentId: 'sub-1',
		childThreadId: 'child-thread-1',
	});
	function prepare(approval = false) {
		const setupResult = setup();
		const taskPath = '/root/research_0';
		assertSubAgentTaskPath(taskPath);
		const suspension: NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getCheckpoint']>>> =
			{
				runId: 'run-1',
				serializedState: 'saved-state',
				updatedAt: new Date(),
				expiresAt: new Date(Date.now() + 96 * 3600_000),
				checkpoint: mock<SerializableAgentState>({
					finishReason: 'paused',
					pendingToolCalls: approval
						? { gate: mock<SerializableAgentState['pendingToolCalls'][string]>() }
						: {},
				}),
				metadata: {
					jobId: job.id,
					taskPath,
					resumeContext: { agentId: 'sub-1' },
					sharedWorkspace: false,
					messageContext: null,
					runtimeSnapshot: 'saved-configuration',
				},
				scope: {
					projectId: 'project-1',
					principalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' }),
				},
			};
		setupResult.jobService.getCheckpoint.mockResolvedValue(suspension);
		setupResult.jobRepository.findById.mockResolvedValue({
			...job,
			status: 'suspended',
			timeoutAt: reservationTimeoutAt,
		});
		setupResult.jobRepository.resumeIfPaused.mockResolvedValue(true);
		return { ...setupResult, suspension };
	}

	it('restores the same run and observes cancellation during resume admission', async () => {
		const { backgroundRunner, runner, jobService, jobRepository, context } = prepare();
		runner.resumePaused.mockImplementation(async (_request, runContext) => {
			await runContext.beforeResume?.();
			await runContext.onResumeClaimed?.();
			runContext.abortSignal?.throwIfAborted();
			return completedRunResult();
		});
		await backgroundRunner.resumePaused(job, context, reservationTimeoutAt);
		await flushDetachedRun();
		expect(runner.resumePaused).toHaveBeenCalledWith(
			expect.objectContaining({ childThreadId: job.childThreadId, childRunId: 'run-1' }),
			expect.objectContaining({ runtimeSnapshot: 'saved-configuration' }),
		);
		expect(jobRepository.resumeIfPaused).toHaveBeenCalledWith(
			job.id,
			'stop-1',
			'running',
			expect.any(Date),
			reservationTimeoutAt,
		);
		expect(jobRepository.resumeIfPaused.mock.calls[0][3].getTime()).toBeGreaterThan(
			Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS - 1000,
		);
		expect(jobService.settle).toHaveBeenCalledWith(
			job.id,
			{ status: 'completed', result: 'the answer' },
			{ status: 'running', timeoutAt: expect.any(Date) },
		);

		jobService.registerAbortController.mockClear();
		jobRepository.resumeIfPaused.mockImplementationOnce(async () => {
			jobService.registerAbortController.mock.lastCall?.[1].abort();
			return true;
		});
		await backgroundRunner.resumePaused(job, context, reservationTimeoutAt);
		await flushDetachedRun();
		expect(runner.resumePaused.mock.lastCall?.[1].abortSignal?.aborted).toBe(true);
	});

	it('preserves a pending approval when a later stop rejects its resume', async () => {
		const { backgroundRunner, runner, jobService, jobRepository, context, suspension } =
			prepare(true);
		jobService.getApproval.mockResolvedValue(
			mock<NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getApproval']>>>>({
				...suspension,
				token: 'approval-1',
				pending: { toolCallId: 'gate', suspended: true },
			}),
		);
		await backgroundRunner.resumePaused(job, context, reservationTimeoutAt);
		expect(jobRepository.resumeIfPaused).toHaveBeenCalledWith(
			job.id,
			'stop-1',
			'suspended',
			expect.any(Date),
			reservationTimeoutAt,
		);
		expect(jobService.notifyResumed).toHaveBeenCalledWith(job.id);
		expect(runner.resumeForeground).not.toHaveBeenCalled();
		expect(runner.resumePaused).not.toHaveBeenCalled();
		jobRepository.resumeIfPaused.mockResolvedValue(false);
		await expect(backgroundRunner.resumePaused(job, context, reservationTimeoutAt)).rejects.toThrow(
			'already resumed',
		);

		const resumedJob: AgentBackgroundJob = { ...job, status: 'suspended', pauseRequestId: null };
		jobRepository.findById.mockResolvedValue(resumedJob);
		jobService.resume.mockImplementationOnce(async () => {
			resumedJob.pauseRequestId = 'stop-2';
			return false;
		});
		runner.resumeForeground.mockImplementation(async (_request, runContext) => {
			await runContext.beforeResume?.();
			await runContext.onResumeClaimed?.();
			runContext.abortSignal?.throwIfAborted();
			return completedRunResult();
		});
		await expect(
			backgroundRunner.resume(
				resumedJob,
				{ token: 'approval-1', resumeData: { approved: true } },
				context,
			),
		).rejects.toThrow('already ended');
		await flushDetachedRun();
		expect(jobService.resume).toHaveBeenCalledWith(job.id, expect.any(Date));
		const controller = jobService.registerAbortController.mock.calls[0][1];
		expect(jobService.unregisterAbortController).toHaveBeenCalledWith(job.id, controller);
		expect(jobService.settle).not.toHaveBeenCalled();
		expect(controller.signal.aborted).toBe(false);

		resumedJob.pauseRequestId = null;
		jobService.registerAbortController.mockClear();
		jobService.resume.mockImplementationOnce(async () => {
			jobService.registerAbortController.mock.lastCall?.[1].abort();
			return true;
		});
		await backgroundRunner.resume(
			resumedJob,
			{ token: 'approval-1', resumeData: { approved: true } },
			context,
		);
		await flushDetachedRun();
		expect(runner.resumeForeground.mock.lastCall?.[1].abortSignal?.aborted).toBe(true);
	});

	it('rejects an expired checkpoint without starting replacement work', async () => {
		const { backgroundRunner, runner, jobService, context } = prepare();
		jobService.getCheckpoint.mockResolvedValue(undefined);
		await expect(backgroundRunner.resumePaused(job, context, reservationTimeoutAt)).rejects.toThrow(
			'checkpoint has expired',
		);
		expect(runner.resumePaused).not.toHaveBeenCalled();
		expect(runner.run).not.toHaveBeenCalled();
	});
});

describe('spawn', () => {
	it('returns before the run finishes and releases its controller when settlement loses', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		jobService.settle.mockResolvedValue(false);
		let resolveRun!: (result: SubAgentRunResult) => void;
		runner.run.mockReturnValue(new Promise((resolve) => (resolveRun = resolve)));

		const receipt = await backgroundRunner.spawn(request, context);

		expect(receipt.status).toBe('started');
		expect(jobService.settle).not.toHaveBeenCalled();
		expect(jobService.unregisterAbortController).not.toHaveBeenCalled();
		const [jobId, abortController] = jobService.registerAbortController.mock.calls[0];

		resolveRun(completedRunResult());
		await flushDetachedRun();
		expect(jobService.settle).toHaveBeenCalledWith(
			jobId,
			{
				status: 'completed',
				result: 'the answer',
			},
			{ status: 'running', timeoutAt: expect.any(Date) },
		);
		expect(jobService.unregisterAbortController).toHaveBeenCalledWith(jobId, abortController);
	});

	it('passes the pre-minted childThreadId to the run and registers it on the job row', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		const registered = jobService.registerSubAgentJob.mock.calls[0][0];
		const spawnRequest = runner.run.mock.calls[0][0];
		expect(spawnRequest.childThreadId).toBe(registered.childThreadId);
		expect(registered.childThreadId).toBeTruthy();
		// The parent identity travels from the request onto the job row.
		expect(registered).toMatchObject({
			parentResourceId: 'resource-1',
			parentPrincipalHash: 'principal-hash',
		});
	});

	it('runs on its own abort scope without parent telemetry or execution counter', async () => {
		const { backgroundRunner, runner, context } = setup();

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		const runContext = runner.run.mock.calls[0][1];
		expect(runContext.abortSignal).toBeInstanceOf(AbortSignal);
		expect(runContext.abortSignal?.aborted).toBe(false);
		expect(runContext.telemetry).toBeUndefined();
		expect(runContext.executionCounter).toBeUndefined();
		expect(runContext.onChunk).toBeUndefined();
	});

	it('forwards a self-delegation difficulty to the run context', async () => {
		const { backgroundRunner, runner, context } = setup();

		await backgroundRunner.spawn({ ...request, difficulty: 'high' }, context);
		await flushDetachedRun();

		expect(runner.run.mock.calls[0][1].selfDelegationDifficulty).toBe('high');
	});

	it('forwards a parent workspace handle to the run and omits the key when none is supplied', async () => {
		const { backgroundRunner, runner, context } = setup();
		const parentWorkspaceHandle = mock<AgentSandboxRuntime>();

		await backgroundRunner.spawn(request, { ...context, parentWorkspaceHandle });
		await flushDetachedRun();
		expect(runner.run.mock.calls[0][1].parentWorkspaceHandle).toBe(parentWorkspaceHandle);

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();
		expect(runner.run.mock.calls[1][1]).not.toHaveProperty('parentWorkspaceHandle');
	});

	it('debits the parent thread as the root budget session and forwards the root cap', async () => {
		const { backgroundRunner, runner, context } = setup();

		await backgroundRunner.spawn(request, { ...context, rootSessionCapUsd: 2 });
		await flushDetachedRun();
		expect(runner.run.mock.calls[0][1]).toMatchObject({
			rootSessionId: 'thread-1',
			rootSessionCapUsd: 2,
			budgetForwarded: true,
		});

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();
		expect(runner.run.mock.calls[1][1]).toMatchObject({
			rootSessionId: 'thread-1',
			rootSessionCapUsd: undefined,
			budgetForwarded: true,
		});
	});

	it('does not start a run when the receipt is limit-reached', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		jobService.registerSubAgentJob.mockResolvedValue({ status: 'limit-reached' });

		const receipt = await backgroundRunner.spawn(request, context);

		expect(receipt).toEqual({ status: 'limit-reached' });
		expect(runner.run).not.toHaveBeenCalled();
	});

	it('rejects an unusable task name before any job row is registered', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();

		await expect(backgroundRunner.spawn({ ...request, taskName: '!!!' }, context)).rejects.toThrow(
			'alphanumeric',
		);
		expect(jobService.registerSubAgentJob).not.toHaveBeenCalled();
		expect(runner.run).not.toHaveBeenCalled();
	});

	it('keeps a completed outcome when the settle write itself fails', async () => {
		const { backgroundRunner, jobService, context } = setup();
		jobService.settle.mockRejectedValue(new Error('db blip'));

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		// The settle-write failure is contained; the outcome is never rewritten
		// as failed over it — the row stays for the sweeper.
		expect(jobService.settle).toHaveBeenCalledTimes(1);
		expect(jobService.settle).toHaveBeenCalledWith(
			expect.any(String),
			{
				status: 'completed',
				result: 'the answer',
			},
			{ status: 'running', timeoutAt: expect.any(Date) },
		);
	});

	it('ends a child that requests an unsupported interaction', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.run.mockResolvedValue(
			completedRunResult({
				status: 'suspended',
				result: {
					runId: 'run-1',
					messages: [],
					pendingSuspend: [{ runId: 'run-1', toolCallId: 'c1', toolName: 't', input: {} }],
					getState: () => ({}),
				},
			} as unknown as Partial<SubAgentRunResult>),
		);

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		expect(jobService.settle).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				status: 'failed',
				error: expect.stringContaining('unsupported interaction'),
			}),
			{ status: 'running', timeoutAt: expect.any(Date) },
		);
	});

	it('settles a thrown run as failed with the error message', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.run.mockRejectedValue(new Error('model exploded'));

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		expect(jobService.settle).toHaveBeenCalledWith(
			expect.any(String),
			{ status: 'failed', error: 'model exploded' },
			{ status: 'running', timeoutAt: expect.any(Date) },
		);
	});

	it.each(['suspended', 'paused'] as const)(
		'stops the execution timer without completing a %s child',
		async (status) => {
			vi.useFakeTimers();
			try {
				const { backgroundRunner, runner, jobService, context } = setup();
				const result = completedRunResult({ status });
				if (status === 'paused') {
					result.result.finishReason = 'paused';
					result.result.pendingSuspend = [];
				}
				runner.run.mockResolvedValue(result);
				jobService.suspend.mockResolvedValue(status === 'suspended');
				await backgroundRunner.spawn(request, context);
				await vi.advanceTimersByTimeAsync(SUB_AGENT_BACKGROUND_TIMEOUT_MS * 2);
				expect(jobService.settle.mock.calls.length).toBe(0);
				expect(runner.run.mock.calls[0][1].abortSignal?.aborted).toBe(false);
			} finally {
				vi.useRealTimers();
			}
		},
	);

	it('settles as timed out and aborts the run when the timeout fires', async () => {
		vi.useFakeTimers();
		try {
			const { backgroundRunner, runner, jobService, context } = setup();
			runner.run.mockReturnValue(new Promise(() => {}));

			await backgroundRunner.spawn(request, context);
			await vi.advanceTimersByTimeAsync(SUB_AGENT_BACKGROUND_TIMEOUT_MS);

			expect(jobService.settle).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ status: 'failed', error: expect.stringContaining('Timed out') }),
				{ status: 'running', timeoutAt: expect.any(Date) },
			);
			const runContext = runner.run.mock.calls[0][1];
			expect(runContext.abortSignal?.aborted).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
