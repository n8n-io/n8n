import {
	AgentEvent,
	getInlineDelegateSubAgentToolOptions,
	INLINE_SUB_AGENT_ID,
	type CredentialProvider,
	type GenerateResult,
	type ModelConfig,
} from '@n8n/agents';
import type { SubAgentSource } from '@n8n/api-types';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { OperationalError, UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import {
	createN8nDelegateSubAgentTool,
	formatSubAgentToolOutput,
} from '../delegate-sub-agent-tool';
import type {
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from '../sub-agent-foreground-runner';

const projectId = 'project-1';

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
	let runner: Mocked<SubAgentForegroundRunner>;
	let credentialProvider: Mocked<CredentialProvider>;

	beforeEach(() => {
		vi.clearAllMocks();
		runner = mock<SubAgentForegroundRunner>();
		runner.runForeground.mockResolvedValue(foregroundResult);
		credentialProvider = mock<CredentialProvider>();
	});

	it('forwards inline sub-agent runtime options into delegate tool metadata', () => {
		const resolveInlineSubAgentProviderTools = vi.fn().mockReturnValue([]);
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
			resolveInlineSubAgentProviderTools,
		});

		const inlineOptions = getInlineDelegateSubAgentToolOptions(tool);
		expect(inlineOptions?.resolveInlineSubAgentProviderTools).toBe(
			resolveInlineSubAgentProviderTools,
		);
		expect(inlineOptions?.shouldRetrySubAgentResumeError?.(new OperationalError('temporary'))).toBe(
			true,
		);
		expect(inlineOptions?.shouldRetrySubAgentResumeError?.(new UserError('terminal'))).toBe(false);
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
			credentialProvider,
			runType: 'production',
			inlineSubAgentModelsByDifficulty,
		});

		expect(getInlineDelegateSubAgentToolOptions(tool)?.inlineSubAgentModelsByDifficulty).toEqual(
			inlineSubAgentModelsByDifficulty,
		);
	});

	it('builds a delegate tool that calls the foreground runner with a configured source', async () => {
		const executionCounter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
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
					executionCounter,
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
				credentialProvider,
				executionCounter: expect.any(Object),
			}),
		);
	});

	it('forwards the parent persistence scope to the runner', async () => {
		const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});

		await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{
				runId: 'parent-run-1',
				persistence: {
					threadId: 'parent-thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeAgentSandboxHostMetadata({ projectId, principalHash }),
				},
			},
		);

		expect(runner.runForeground).toHaveBeenCalledWith(
			expect.objectContaining({
				parentThreadId: 'parent-thread-1',
				parentResourceId: 'resource-1',
				parentSandboxPrincipalHash: principalHash,
			}),
			expect.any(Object),
		);
	});

	it('forwards the parent telemetry from the tool context to the foreground runner', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});
		const parentTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			functionId: 'parent-agent',
		};

		await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{ runId: 'parent-run-1', parentTelemetry },
		);

		expect(runner.runForeground).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ telemetry: parentTelemetry }),
		);
	});

	it('omits telemetry from the runner context when the parent run has none', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});

		await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{ runId: 'parent-run-1' },
		);

		expect(runner.runForeground.mock.calls[0]?.[1]).not.toHaveProperty('telemetry');
	});

	it('selects a configured n8n agent source by subAgentId', async () => {
		const selectedSource: SubAgentSource = { agentId: 'agent-2' };
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: {
				'agent-2': selectedSource,
			},
			availableSubAgents: [
				{
					id: 'agent-2',
					name: 'Research Agent',
					useWhen: 'Use for research tasks.',
				},
			],
			projectId,
			credentialProvider,
			runType: 'production',
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
			runType: 'production',
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
		const runInlineSubAgent = vi.fn().mockResolvedValue({
			status: 'completed',
			taskPath: '/root/research_api_0',
			runId: 'inline-run-1',
			answer: 'Inline answer',
		});
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
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
				{ runInlineSubAgent, emitChunk: () => undefined },
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
			credentialProvider,
			runType: 'production',
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

	it('routes a configured child resume to the exact persisted checkpoint', async () => {
		runner.resumeForeground.mockResolvedValue(foregroundResult);
		const parentExecutionCounter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});
		const resumeSubAgent = getInlineDelegateSubAgentToolOptions(tool)?.resumeSubAgent;
		expect(resumeSubAgent).toBeDefined();
		const request = {
			subAgentId: 'agent-2',
			taskName: 'Research API',
			goal: 'Find behavior.',
			taskPath: '/root/research_api_0' as const,
			childCount: 0,
			childRunId: 'child-run-1',
			childToolCallId: 'child-tool-call-1',
			childThreadId: 'child-thread-1',
			resumeData: { approved: true },
			resumeContext: { agentId: 'agent-2', versionId: 'version-7' },
			parentThreadId: 'parent-thread-1',
			parentExecutionCounter,
		};

		await expect(
			resumeSubAgent?.(request, { runInlineSubAgent: vi.fn(), emitChunk: vi.fn() }),
		).resolves.toMatchObject({
			status: 'completed',
			taskPath: '/root/research_api_0',
			runId: 'child-run-1',
		});
		expect(runner.resumeForeground).toHaveBeenCalledWith(
			request,
			expect.objectContaining({ executionCounter: parentExecutionCounter }),
		);
	});

	it.each([
		{
			name: 'expired checkpoint',
			error: new UserError('This action has expired and cannot be resumed'),
		},
		{
			name: 'missing pinned version',
			error: new NotFoundError('Version "version-7" not found for agent "agent-2"'),
		},
	])('finishes a configured child resume when the $name error is terminal', async ({ error }) => {
		runner.resumeForeground.mockRejectedValue(error);
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});
		const suspend = vi.fn().mockResolvedValue(undefined);
		const emitEvent = vi.fn();

		const result = await tool.handler?.(
			{ subAgentId: 'agent-2', taskName: 'Research API', goal: 'Find behavior.' },
			{
				runId: 'parent-run-1',
				toolCallId: 'parent-tool-call-1',
				resumeData: { approved: true },
				suspendPayload: { type: 'approval', toolName: 'http_request', args: {} },
				continuation: {
					runId: 'child-run-1',
					toolCallId: 'child-tool-call-1',
					taskPath: '/root/research_api_0',
					subAgentId: 'agent-2',
					childCount: 0,
					threadId: 'child-thread-1',
					resumeContext: { agentId: 'agent-2', versionId: 'version-7' },
				},
				suspend,
				emitEvent,
			},
		);

		expect(result).toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api_0',
			answer: '',
			error: error.message,
		});
		expect(suspend).not.toHaveBeenCalled();
		expect(emitEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: AgentEvent.SubAgentCompleted,
				status: 'failed',
				taskPath: '/root/research_api_0',
				error: error.message,
			}),
		);
	});

	it('routes configured child cancellation without resuming the child', async () => {
		const tool = createN8nDelegateSubAgentTool({
			runner,
			sourcesById: { 'agent-2': source },
			projectId,
			credentialProvider,
			runType: 'production',
		});
		const cancelSubAgent = getInlineDelegateSubAgentToolOptions(tool)?.cancelSubAgent;
		expect(cancelSubAgent).toBeDefined();
		const request = {
			subAgentId: 'agent-2',
			taskName: 'Research API',
			goal: 'Find behavior.',
			taskPath: '/root/research_api_0' as const,
			childCount: 0,
			childRunId: 'child-run-1',
			childToolCallId: 'child-tool-call-1',
			resumeContext: { agentId: 'agent-2', versionId: 'version-7' },
			reason: 'take another approach',
		};

		await cancelSubAgent?.(request, { runInlineSubAgent: vi.fn(), emitChunk: vi.fn() });

		expect(runner.cancelForeground).toHaveBeenCalledWith(request);
		expect(runner.resumeForeground).not.toHaveBeenCalled();
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
