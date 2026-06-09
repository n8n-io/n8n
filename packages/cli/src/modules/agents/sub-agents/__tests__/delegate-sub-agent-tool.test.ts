import {
	getInlineDelegateSubAgentToolOptions,
	INLINE_SUB_AGENT_ID,
	type CredentialProvider,
	type GenerateResult,
	type ModelConfig,
} from '@n8n/agents';
import type { SubAgentSource } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import {
	createN8nDelegateSubAgentTool,
	formatSubAgentToolOutput,
} from '../delegate-sub-agent-tool';
import type {
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from '../sub-agent-foreground-runner';

const projectId = 'project-1';
const userId = 'user-1';

const source: SubAgentSource = {
	agentId: 'agent-2',
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
	getState: () => {
		throw new Error('not implemented');
	},
};

const foregroundResult: SubAgentForegroundResult = {
	taskPath: '/root/research_api_0',
	threadId: 'child-thread-1',
	status: 'completed',
	result: generateResult,
};

describe('createN8nDelegateSubAgentTool', () => {
	let runner: jest.Mocked<SubAgentForegroundRunner>;
	let credentialProvider: jest.Mocked<CredentialProvider>;

	beforeEach(() => {
		jest.clearAllMocks();
		runner = mock<SubAgentForegroundRunner>();
		runner.runForeground.mockResolvedValue(foregroundResult);
		credentialProvider = mock<CredentialProvider>();
	});

	it('forwards resolveInlineSubAgentProviderTools into delegate tool metadata', () => {
		const resolveInlineSubAgentProviderTools = jest.fn().mockReturnValue([]);
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
			resolveInlineSubAgentProviderTools,
		});

		expect(getInlineDelegateSubAgentToolOptions(tool)?.resolveInlineSubAgentProviderTools).toBe(
			resolveInlineSubAgentProviderTools,
		);
	});

	it('forwards inlineSubAgentModelsByDifficulty into delegate tool metadata', () => {
		const inlineSubAgentModelsByDifficulty: Partial<
			Record<'low' | 'medium' | 'high', ModelConfig>
		> = {
			low: { id: 'openai/gpt-4o-mini', apiKey: 'low-key' },
			high: { id: 'anthropic/claude-sonnet-4-5', apiKey: 'high-key' },
		};
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
			inlineSubAgentModelsByDifficulty,
		});

		expect(getInlineDelegateSubAgentToolOptions(tool)?.inlineSubAgentModelsByDifficulty).toEqual(
			inlineSubAgentModelsByDifficulty,
		);
	});

	it('builds a delegate tool that calls the foreground runner with a configured source', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
			policy: { maxChildren: 2 },
		});

		await expect(
			tool.handler?.(
				{
					subAgentId: 'agent-2',
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
			taskPath: '/root/research_api_0',
			runId: 'child-run-1',
			threadId: 'child-thread-1',
			answer: 'Preamble\nChild answer',
		});

		expect(runner.runForeground).toHaveBeenCalledWith(
			{
				goal: 'Find the API behavior.',
				context: 'Focus on auth endpoints.',
				expectedOutput: 'A short summary.',
				source,
				executionMode: 'foreground',
				policy: { maxChildren: 2 },
				taskPath: '/root/research_api_0',
			},
			expect.objectContaining({
				projectId,
				userId,
				credentialProvider,
			}),
		);
	});

	it('forwards the parent persistence thread id and resource id to the runner', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
		});

		await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{
				runId: 'parent-run-1',
				persistence: { threadId: 'parent-thread-1', resourceId: 'resource-1' },
			},
		);

		expect(runner.runForeground).toHaveBeenCalledWith(
			expect.objectContaining({
				parentThreadId: 'parent-thread-1',
				parentResourceId: 'resource-1',
			}),
			expect.any(Object),
		);
	});

	it('selects a configured n8n agent source by subAgentId', async () => {
		const selectedSource: SubAgentSource = { agentId: 'agent-2' };
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: {
				'agent-2': selectedSource,
			},
			availableSubAgents: [{ id: 'agent-2', name: 'Research Agent' }],
			projectId,
			userId,
			credentialProvider,
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
			userId,
			credentialProvider,
		});

		await expect(
			tool.handler?.(
				{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
				{ runId: 'parent-run-1' },
			),
		).resolves.toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api_0',
			answer: '',
			error: 'child failed',
		});
	});

	it('routes inline subAgentId through runInlineSubAgent helpers instead of the foreground runner', async () => {
		const runInlineSubAgent = jest.fn().mockResolvedValue({
			status: 'completed',
			taskPath: '/root/research_api_0',
			runId: 'inline-run-1',
			answer: 'Inline answer',
		});
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
		});
		const runSubAgent = getInlineDelegateSubAgentToolOptions(tool)?.runSubAgent;
		expect(runSubAgent).toBeDefined();

		await expect(
			runSubAgent?.(
				{
					subAgentId: INLINE_SUB_AGENT_ID,
					taskName: 'Research API',
					goal: 'Find behavior.',
					taskPath: '/root/research_api_0',
					childCount: 0,
				},
				{ runInlineSubAgent },
			),
		).resolves.toMatchObject({
			status: 'completed',
			taskPath: '/root/research_api_0',
			answer: 'Inline answer',
		});

		expect(runInlineSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				subAgentId: INLINE_SUB_AGENT_ID,
				goal: 'Find behavior.',
			}),
		);
		expect(runner.runForeground).not.toHaveBeenCalled();
	});

	it('requires Agent inline helpers when inline is invoked through the tool handler directly', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			userId,
			credentialProvider,
		});

		await expect(
			tool.handler?.(
				{ subAgentId: INLINE_SUB_AGENT_ID, taskName: 'Research API', goal: 'Find behavior.' },
				{ runId: 'parent-run-1' },
			),
		).resolves.toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api_0',
			answer: '',
			error:
				'delegate_subagent host runner does not support inline delegation without helpers.runInlineSubAgent from an Agent build.',
		});
		expect(runner.runForeground).not.toHaveBeenCalled();
	});
});

describe('formatSubAgentToolOutput', () => {
	it('keeps child metadata compact for the parent model', () => {
		expect(formatSubAgentToolOutput(foregroundResult)).toEqual({
			status: 'completed',
			taskPath: '/root/research_api_0',
			runId: 'child-run-1',
			threadId: 'child-thread-1',
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
