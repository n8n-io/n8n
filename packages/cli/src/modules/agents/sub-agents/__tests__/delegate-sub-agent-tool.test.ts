import type { CredentialProvider, GenerateResult } from '@n8n/agents';
import type { RunnableAgentJsonConfig, SubAgentSource } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { ToolExecutor } from '../../json-config/from-json-config';
import {
	createN8nDelegateSubAgentTool,
	formatSubAgentToolOutput,
} from '../delegate-sub-agent-tool';
import type {
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from '../sub-agent-foreground-runner';

const projectId = 'project-1';

const runnableConfig: RunnableAgentJsonConfig = {
	name: 'Helper Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Help with delegated work.',
};

const source: SubAgentSource = {
	type: 'inline',
	config: runnableConfig,
};

const generateResult: GenerateResult = {
	runId: 'child-run-1',
	finishReason: 'stop',
	usage: {
		promptTokens: 10,
		completionTokens: 5,
		totalTokens: 15,
		cost: 0.01,
	},
	messages: [
		{
			role: 'assistant',
			type: 'llm',
			content: [
				{ type: 'text', text: 'Preamble' },
				{ type: 'text', text: 'Child answer' },
			],
		},
	],
};

const foregroundResult: SubAgentForegroundResult = {
	taskPath: '/root/research_api',
	source: {
		type: 'inline',
		config: runnableConfig,
	},
	status: 'completed',
	startedAt: 100,
	finishedAt: 150,
	durationMs: 50,
	result: generateResult,
};

describe('createN8nDelegateSubAgentTool', () => {
	let runner: jest.Mocked<SubAgentForegroundRunner>;
	let credentialProvider: jest.Mocked<CredentialProvider>;
	let toolExecutor: jest.Mocked<ToolExecutor>;
	let createToolExecutor: jest.Mock;
	let createMemoryFactory: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		runner = mock<SubAgentForegroundRunner>();
		runner.runForeground.mockResolvedValue(foregroundResult);
		credentialProvider = mock<CredentialProvider>();
		toolExecutor = mock<ToolExecutor>();
		createToolExecutor = jest.fn().mockReturnValue(toolExecutor);
		createMemoryFactory = jest.fn().mockReturnValue(jest.fn());
	});

	it('builds a delegate tool that calls the foreground runner with a configured source', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
			policy: { maxChildren: 2, timeoutMs: 1000 },
			parentTaskPath: '/root',
		});

		await expect(
			tool.handler?.(
				{
					taskName: 'Research API',
					goal: 'Find the API behavior.',
					context: 'Focus on auth endpoints.',
					expectedOutput: 'A short summary.',
				},
				{
					runId: 'parent-run-1',
					toolCallId: 'tool-call-1',
				},
			),
		).resolves.toMatchObject({
			status: 'completed',
			taskPath: '/root/research_api',
			runId: 'child-run-1',
			answer: 'Preamble\nChild answer',
		});

		expect(runner.runForeground).toHaveBeenCalledWith(
			{
				taskName: 'Research API',
				goal: 'Find the API behavior.',
				context: 'Focus on auth endpoints.',
				expectedOutput: 'A short summary.',
				source,
				contextMode: 'fresh',
				executionMode: 'foreground',
				policy: { maxChildren: 2, timeoutMs: 1000 },
				parentRunId: 'parent-run-1',
				parentToolCallId: 'tool-call-1',
				parentTaskPath: '/root',
			},
			expect.objectContaining({
				projectId,
				childCount: 0,
				credentialProvider,
				createToolExecutor,
				createMemoryFactory,
			}),
		);
	});

	it('passes incrementing child counts from the SDK tool to the runner', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
			policy: { maxChildren: 3 },
		});

		await tool.handler?.({ taskName: 'One', goal: 'First task.' }, { runId: 'parent-run-1' });
		await tool.handler?.({ taskName: 'Two', goal: 'Second task.' }, { runId: 'parent-run-1' });

		expect(runner.runForeground).toHaveBeenNthCalledWith(
			1,
			expect.any(Object),
			expect.objectContaining({ childCount: 0 }),
		);
		expect(runner.runForeground).toHaveBeenNthCalledWith(
			2,
			expect.any(Object),
			expect.objectContaining({ childCount: 1 }),
		);
	});

	it('selects a configured n8n agent source by subAgentId', async () => {
		const selectedSource: SubAgentSource = { type: 'n8n-agent', agentId: 'agent-2' };
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: {
				'agent-2': selectedSource,
			},
			availableSubAgents: [{ id: 'agent-2', name: 'Research Agent' }],
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
		});

		await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{ runId: 'parent-run-1' },
		);

		expect(runner.runForeground).toHaveBeenCalledWith(
			expect.objectContaining({
				source: selectedSource,
			}),
			expect.any(Object),
		);
	});

	it('returns a failed tool output when the foreground runner throws', async () => {
		runner.runForeground.mockRejectedValue(new Error('child failed'));
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
		});

		await expect(
			tool.handler?.(
				{ taskName: 'Research API', goal: 'Find behavior.' },
				{ runId: 'parent-run-1' },
			),
		).resolves.toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api',
			answer: '',
			error: 'child failed',
		});
	});
});

describe('formatSubAgentToolOutput', () => {
	it('keeps child metadata compact for the parent model', () => {
		expect(formatSubAgentToolOutput(foregroundResult)).toEqual({
			status: 'completed',
			taskPath: '/root/research_api',
			runId: 'child-run-1',
			answer: 'Preamble\nChild answer',
			usage: {
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				cost: 0.01,
			},
			finishReason: 'stop',
		});
	});
});
