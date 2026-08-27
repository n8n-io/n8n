import type { CredentialProvider } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentBackgroundJobService, BackgroundJobView } from '../agent-background-job.service';
import {
	createCancelBackgroundJobTool,
	createCheckBackgroundJobsTool,
	createSpawnBackgroundSubAgentTool,
	type BackgroundJobToolsOptions,
} from '../background-job-tools';
import type { SubAgentBackgroundRunner } from '../sub-agent-background-runner';

const persistence = { threadId: 'thread-1', resourceId: 'resource-1' };

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
});
