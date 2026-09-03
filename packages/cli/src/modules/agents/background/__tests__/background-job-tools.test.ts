import type { CredentialProvider } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentBackgroundJobService, BackgroundJobView } from '../agent-background-job.service';
import {
	createCancelBackgroundJobTool,
	createCheckBackgroundJobsTool,
	createSpawnBackgroundSubAgentTool,
	type BackgroundJobToolsOptions,
} from '../background-job-tools';
import type { SubAgentBackgroundRunner } from '../sub-agent-background-runner';

const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
const persistence = {
	threadId: 'thread-1',
	resourceId: 'resource-1',
	hostMetadata: encodeAgentSandboxHostMetadata({ projectId: 'project-1', principalHash }),
};

function jobView(overrides: Partial<BackgroundJobView> = {}): BackgroundJobView {
	return {
		id: 'job-1',
		kind: 'subagent',
		title: 'research',
		status: 'running',
		result: null,
		error: null,
		createdAt: new Date('2026-08-26T10:00:00Z'),
		timeoutAt: null,
		settledAt: null,
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

describe('spawn_background_subagent', () => {
	it('reads the parent thread from ctx.persistence at call time', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createSpawnBackgroundSubAgentTool(options);

		const output = await tool.handler!(
			{ subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'started', jobId: 'job-1' });
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			parentThreadId: 'thread-1',
			parentResourceId: 'resource-1',
		});
	});

	it('rejects when no persisted thread is active', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createSpawnBackgroundSubAgentTool(options);

		const output = await tool.handler!(
			{ subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{},
		);

		expect(output).toMatchObject({ status: 'rejected' });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('rejects unknown sub-agent ids listing the available ones', async () => {
		const { backgroundRunner, options } = setup();
		const tool = createSpawnBackgroundSubAgentTool(options);

		const output = await tool.handler!(
			{ subAgentId: 'nope', taskName: 'research', goal: 'find things' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'rejected', note: expect.stringContaining('sub-1') });
		expect(backgroundRunner.spawn).not.toHaveBeenCalled();
	});

	it('forwards context and expectedOutput to the spawn request', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createSpawnBackgroundSubAgentTool(options);

		await tool.handler!(
			{
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

	it('forwards the sandbox principal when the host scope matches the project', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createSpawnBackgroundSubAgentTool(options);
		const input = { subAgentId: 'sub-1', taskName: 'research', goal: 'find things' };

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
		const tool = createSpawnBackgroundSubAgentTool(options);

		const output = await tool.handler!(
			{ subAgentId: 'inline', taskName: 'research', goal: 'find things', difficulty: 'high' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'started', jobId: 'job-1' });
		expect(backgroundRunner.spawn.mock.calls[0][0]).toMatchObject({
			subAgentId: 'agent-1',
			source: { agentId: 'agent-1' },
			difficulty: 'high',
		});
	});

	it('ignores difficulty for configured sub-agents — it only applies to self-delegation', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'started', jobId: 'job-1' });
		const tool = createSpawnBackgroundSubAgentTool(options);

		await tool.handler!(
			{ subAgentId: 'sub-1', taskName: 'research', goal: 'find things', difficulty: 'high' },
			{ persistence },
		);

		expect(backgroundRunner.spawn.mock.calls[0][0]).not.toHaveProperty('difficulty');
	});

	it('echoes a limit-reached receipt in the tool output', async () => {
		const { backgroundRunner, options } = setup();
		backgroundRunner.spawn.mockResolvedValue({ status: 'limit-reached' });
		const tool = createSpawnBackgroundSubAgentTool(options);

		const output = await tool.handler!(
			{ subAgentId: 'sub-1', taskName: 'research', goal: 'find things' },
			{ persistence },
		);

		expect(output).toMatchObject({ status: 'limit-reached' });
	});
});

describe('check_background_jobs', () => {
	it('lists only jobs of the calling thread', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView(),
			jobView({ id: 'job-2', status: 'completed', result: 'the answer' }),
		]);
		const tool = createCheckBackgroundJobsTool(options.jobService);

		const output = await tool.handler!({}, { persistence });

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
		const tool = createCheckBackgroundJobsTool(options.jobService);

		const output = await tool.handler!({}, { persistence });

		expect(output).toMatchObject({
			jobs: [expect.objectContaining({ executionId: 'exec-1' })],
		});
	});

	it('truncates oversized results in the echo', async () => {
		const { jobService, options } = setup();
		jobService.listForThread.mockResolvedValue([
			jobView({ status: 'completed', result: 'x'.repeat(10_000) }),
		]);
		const tool = createCheckBackgroundJobsTool(options.jobService);

		const output = (await tool.handler!({}, { persistence })) as {
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
		const tool = createCheckBackgroundJobsTool(options.jobService);

		const output = (await tool.handler!({}, { persistence })) as {
			jobs: Array<{ error: string }>;
		};

		expect(output.jobs[0].error.length).toBeLessThan(10_000);
		expect(output.jobs[0].error).toContain('truncated');
	});

	it('returns an empty listing when no persisted thread is active', async () => {
		const { jobService, options } = setup();
		const tool = createCheckBackgroundJobsTool(options.jobService);

		const output = await tool.handler!({}, {});

		expect(output).toMatchObject({ jobs: [], note: expect.stringContaining('No persisted') });
		expect(jobService.listForThread).not.toHaveBeenCalled();
	});
});

describe('cancel_background_job', () => {
	it('cancels within the calling thread only', async () => {
		const { jobService, options } = setup();
		jobService.cancel.mockResolvedValue('cancelled');
		const tool = createCancelBackgroundJobTool(options.jobService);

		const output = await tool.handler!({ jobId: 'job-1' }, { persistence });

		expect(jobService.cancel).toHaveBeenCalledWith('thread-1', 'job-1');
		expect(output).toEqual({ status: 'cancelled' });
	});

	it('returns not-found without cancelling when no persisted thread is active', async () => {
		const { jobService, options } = setup();
		const tool = createCancelBackgroundJobTool(options.jobService);

		const output = await tool.handler!({ jobId: 'job-1' }, {});

		expect(output).toEqual({ status: 'not-found' });
		expect(jobService.cancel).not.toHaveBeenCalled();
	});
});
