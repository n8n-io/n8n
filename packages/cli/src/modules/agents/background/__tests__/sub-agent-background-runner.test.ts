import type { CredentialProvider } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

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

	it('settles a suspended child as failed — background runs cannot answer HITL', async () => {
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
			expect.objectContaining({ status: 'failed', error: expect.stringContaining('human input') }),
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
