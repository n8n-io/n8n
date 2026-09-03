import type { CredentialProvider } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type {
	AgentBackgroundJob,
	AgentBackgroundJobSuspension,
} from '../../entities/agent-background-job.entity';
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

function suspendedRunResult(suspendPayload: unknown = { type: 'approval', toolName: 'http' }) {
	return completedRunResult({
		status: 'suspended',
		resumeContext: { agentId: 'sub-1' },
		result: {
			runId: 'run-1',
			messages: [],
			pendingSuspend: [
				{
					runId: 'run-1',
					toolCallId: 'c1',
					toolName: 'approval',
					input: {},
					suspendPayload,
				},
			],
			getState: () => ({}),
		},
	} as unknown as Partial<SubAgentRunResult>);
}

const request: BackgroundSpawnRequest = {
	subAgentId: 'sub-1',
	source: { agentId: 'sub-1' },
	taskName: 'research',
	goal: 'find things',
	parentThreadId: 'thread-1',
	parentResourceId: 'resource-1',
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
	jobService.park.mockResolvedValue(true);
	jobService.settleSuspended.mockResolvedValue(true);
	runner.run.mockResolvedValue(completedRunResult());
	runner.resumeForeground.mockResolvedValue(completedRunResult());

	const backgroundRunner = new SubAgentBackgroundRunner(runner, jobService, logger);
	const context = {
		projectId: 'project-1',
		parentAgentId: 'agent-1',
		credentialProvider: mock<CredentialProvider>(),
		runType: 'production' as const,
	};
	return { backgroundRunner, runner, jobService, context };
}

async function flushDetachedRun() {
	// The run is fire-and-forget; a macrotask boundary drains the whole nested
	// microtask chain (nextTick would leave later reactions queued behind us).
	await new Promise((resolve) => setImmediate(resolve));
}

describe('spawn', () => {
	it('returns a started receipt before the detached run settles', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		let resolveRun!: (result: SubAgentRunResult) => void;
		runner.run.mockReturnValue(new Promise((resolve) => (resolveRun = resolve)));

		const receipt = await backgroundRunner.spawn(request, context);

		expect(receipt.status).toBe('started');
		expect(jobService.settle).not.toHaveBeenCalled();

		resolveRun(completedRunResult());
		await flushDetachedRun();
		expect(jobService.settle).toHaveBeenCalledWith(expect.any(String), {
			status: 'completed',
			result: 'the answer',
		});
	});

	it('passes the pre-minted childThreadId to the run and registers it on the job row', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		const registered = jobService.registerSubAgentJob.mock.calls[0][0];
		const spawnRequest = runner.run.mock.calls[0][0];
		expect(spawnRequest.childThreadId).toBe(registered.childThreadId);
		expect(registered.childThreadId).toBeTruthy();
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
		expect(jobService.settle).toHaveBeenCalledWith(expect.any(String), {
			status: 'completed',
			result: 'the answer',
		});
	});

	it('parks a suspended child with its resume context', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.run.mockResolvedValue(suspendedRunResult());

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		expect(jobService.park).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				childRunId: 'run-1',
				childToolCallId: 'c1',
				suspendPayload: { type: 'approval', toolName: 'http' },
				resumeContext: { agentId: 'sub-1' },
			}),
		);
		expect(jobService.settle).not.toHaveBeenCalled();
	});

	it('fails a suspended child whose request is not an approval', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.run.mockResolvedValue(suspendedRunResult({ type: 'question', message: 'Choose' }));

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		expect(jobService.park).not.toHaveBeenCalled();
		expect(jobService.settleSuspended).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ status: 'failed' }),
			{ runId: 'run-1', agentId: 'sub-1' },
		);
	});

	it('settles a thrown run as failed with the error message', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.run.mockRejectedValue(new Error('model exploded'));

		await backgroundRunner.spawn(request, context);
		await flushDetachedRun();

		expect(jobService.settle).toHaveBeenCalledWith(expect.any(String), {
			status: 'failed',
			error: 'model exploded',
		});
	});

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
			);
			const runContext = runner.run.mock.calls[0][1];
			expect(runContext.abortSignal?.aborted).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('resume', () => {
	const job = {
		id: 'job-1',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		title: 'research',
		subAgentId: 'sub-1',
		childThreadId: 'child-thread-1',
	} as AgentBackgroundJob;
	const suspension: AgentBackgroundJobSuspension = {
		childRunId: 'run-1',
		childToolCallId: 'c1',
		childAgentId: 'sub-1',
		suspendPayload: { type: 'approval', toolName: 'http' },
		taskPath: '/root/research_0',
		resumeContext: { agentId: 'sub-1' },
		goal: 'find things',
	};

	it('continues the child from its checkpoint with the parent context and settles the answer', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		const user = { id: 'user-1' } as User;

		backgroundRunner.resume(job, suspension, { approved: true }, { ...context, user });
		await flushDetachedRun();

		expect(runner.resumeForeground).toHaveBeenCalledWith(
			expect.objectContaining({
				childRunId: 'run-1',
				childToolCallId: 'c1',
				childThreadId: 'child-thread-1',
				resumeContext: { agentId: 'sub-1' },
				resumeData: { approved: true },
			}),
			expect.objectContaining({
				projectId: 'project-1',
				runType: 'production',
				credentialProvider: context.credentialProvider,
				user,
			}),
		);
		expect(jobService.settle).toHaveBeenCalledWith('job-1', {
			status: 'completed',
			result: 'the answer',
		});
	});

	it('parks the child again when it suspends after resume', async () => {
		const { backgroundRunner, runner, jobService, context } = setup();
		runner.resumeForeground.mockResolvedValue(
			suspendedRunResult({ type: 'approval', toolName: 'email' }),
		);

		backgroundRunner.resume(job, suspension, { approved: true }, context);
		await flushDetachedRun();

		expect(jobService.park).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({
				childRunId: 'run-1',
				suspendPayload: { type: 'approval', toolName: 'email' },
			}),
		);
	});
});
