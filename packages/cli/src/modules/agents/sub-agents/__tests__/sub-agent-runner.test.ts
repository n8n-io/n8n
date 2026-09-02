import {
	INLINE_SUB_AGENT_ID,
	type BuiltAgent,
	type BuiltTelemetry,
	type CredentialProvider,
	type StreamChunk,
	type StreamResult,
} from '@n8n/agents';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import { AgentRuntimeReconstructionService } from '../../agent-runtime-reconstruction.service';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentSandboxRuntime } from '../../agent-sandbox-runtime.service';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import { SubAgentRunner } from '../sub-agent-runner';
import type {
	ResolvedSubAgentRuntimeSource,
	SubAgentSourceResolver,
} from '../sub-agent-source-resolver';

const projectId = 'project-1';
const parentThreadId = 'parent-thread-1';
const parentAgentId = 'parent-agent-1';

const runnableConfig: RunnableAgentJsonConfig = {
	name: 'Helper Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Help with delegated work.',
};

const source: ResolvedSubAgentSource = {
	sourceId: 'agent-1',
	config: runnableConfig,
};

const runtimeSource: ResolvedSubAgentRuntimeSource = {
	source,
	toolDescriptors: {
		tool_1: {
			name: 'lookup_customer',
			description: 'Look up a customer',
			systemInstruction: null,
			inputSchema: {
				type: 'object',
				properties: {},
			},
			outputSchema: null,
			hasSuspend: false,
			hasResume: false,
			hasToMessage: false,
			requireApproval: false,
			providerOptions: null,
		},
	},
	toolCodeByName: {
		lookup_customer: 'return input;',
	},
	skills: {
		skill_1: {
			name: 'Skill 1',
			description: 'Helps with tests',
			instructions: 'Skill body',
		},
	},
};

const spawnRequest: SubAgentSpawnRequest = {
	goal: 'Find the relevant API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A concise summary.',
	source: {
		agentId: 'agent-1',
	},
	parentThreadId,
	taskPath: '/root/research_api_0',
};

const delegatedRequest = {
	subAgentId: 'agent-1',
	taskName: 'Research API',
	goal: spawnRequest.goal,
	context: spawnRequest.context,
	expectedOutput: spawnRequest.expectedOutput,
	taskPath: '/root/research_api_0' as const,
	childCount: 0,
};

const defaultStreamChunks: StreamChunk[] = [
	{ type: 'text-delta', id: 'text-1', delta: 'Child answer' },
	{
		type: 'finish',
		finishReason: 'stop',
		model: 'anthropic/claude-sonnet-4-5',
		usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
	},
];

describe('SubAgentRunner', () => {
	let sourceResolver: Mocked<SubAgentSourceResolver>;
	let reconstructionService: Mocked<AgentRuntimeReconstructionService>;
	let runner: SubAgentRunner;
	let childAgent: Mocked<BuiltAgent>;
	let agentExecutionService: Mocked<AgentExecutionService>;
	let logger: Mocked<Logger>;
	let checkpointStorage: Mocked<N8NCheckpointStorage>;
	let credentialProvider: Mocked<CredentialProvider>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
		sourceResolver = mock<SubAgentSourceResolver>();
		sourceResolver.resolveForRuntime.mockResolvedValue(runtimeSource);
		reconstructionService = mock<AgentRuntimeReconstructionService>();
		Container.set(AgentRuntimeReconstructionService, reconstructionService);
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.startExecutionRecording.mockResolvedValue('agent-execution-1');
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		checkpointStorage = mock<N8NCheckpointStorage>();
		logger = mock<Logger>();
		runner = new SubAgentRunner(sourceResolver, agentExecutionService, checkpointStorage, logger);

		childAgent = mock<BuiltAgent>();
		childAgent.stream.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		childAgent.close.mockResolvedValue(undefined);
		reconstructionService.reconstructFromResolvedSource.mockResolvedValue({
			agent: childAgent as never,
			toolRegistry: new Map(),
		});

		credentialProvider = mock<CredentialProvider>();
	});

	it('resolves reconstruction from the container at run time', async () => {
		await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledTimes(1);
	});

	it('rebuilds the child through the shared reconstruction service and runs it with a fresh prompt', async () => {
		agentExecutionService.startExecutionRecording.mockResolvedValue('agent-execution-1');
		agentExecutionService.finalizeExecution.mockResolvedValue('agent-execution-1');
		const result = await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
		});

		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			threadId: expect.any(String),
			status: 'completed',
			result: expect.objectContaining({
				runId: 'child-run-1',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
			}),
		});
		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith({
			config: runnableConfig,
			memoryOwnerAgentId: 'agent-1',
			projectId,
			credentialProvider,
			runType: 'production',
			toolDescriptors: runtimeSource.toolDescriptors,
			toolCodeByName: runtimeSource.toolCodeByName,
			skills: runtimeSource.skills,
			runtimeProfile: 'sub-agent',
			parentAgentIdForDelegation: undefined,
			user: undefined,
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.stringContaining('YOUR TASK:\nFind the relevant API behavior.'),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
				},
			}),
		);
		const childPrompt = childAgent.stream.mock.calls[0]?.[0] as string;
		expect(childPrompt).toContain('CONTEXT:\nFocus on auth endpoints.');
		expect(childPrompt).toContain('EXPECTED OUTPUT:\nA concise summary.');
		expect(agentExecutionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: result.threadId, source: 'subagent' }),
			expect.any(Date),
		);
		expect(agentExecutionService.recordTimelineSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				agentId: 'agent-1',
				threadId: result.threadId,
				executionId: 'agent-execution-1',
			}),
		);
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-1',
				source: 'subagent',
				telemetry: {
					runType: 'production',
					configuration: expect.objectContaining({
						model: 'anthropic/claude-sonnet-4-5',
					}),
				},
			}),
		);
		const startedAt = agentExecutionService.startExecutionRecording.mock.calls[0][1];
		const finalizedRecord = agentExecutionService.finalizeExecution.mock.calls[0][1].record;
		expect(startedAt.getTime()).toBe(finalizedRecord.startTime);
	});

	it('runs the child on a caller-supplied childThreadId instead of minting one', async () => {
		// The seam a background dispatcher relies on: its durable job row points
		// at this id, so orphan reconciliation only works if the run honors it.
		const result = await runner.run(
			{ ...spawnRequest, childThreadId: 'pre-minted-thread' },
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(result.threadId).toBe('pre-minted-thread');
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: expect.objectContaining({ threadId: 'pre-minted-thread' }),
			}),
		);
	});

	it('records the child turn with the parent run type, not its own published state', async () => {
		const result = await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'test',
		});

		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-1',
				telemetry: expect.objectContaining({ runType: 'test' }),
			}),
		);
	});

	it.each([
		{ runType: 'test' as const, usePublishedVersion: false },
		{ runType: 'production' as const, usePublishedVersion: true },
	])(
		'resolves the child draft for test runs and the published version for production ($runType)',
		async ({ runType, usePublishedVersion }) => {
			await runner.run(spawnRequest, { projectId, credentialProvider, runType });

			expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(spawnRequest.source, {
				projectId,
				usePublishedVersion,
			});
		},
	);

	it.each(['integrated', 'manual'] as const)(
		'reconstructs child workflow tools with the parent %s execution mode',
		async (workflowToolExecutionMode) => {
			await runner.run(spawnRequest, {
				projectId,
				credentialProvider,
				runType: 'production',
				workflowToolExecutionMode,
			});

			expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
				expect.objectContaining({ workflowToolExecutionMode }),
			);
		},
	);

	it('filters sub-agent tools by the delegating user access when the parent run has a user', async () => {
		const user = mock<User>({ id: 'user-1' });

		await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			user,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({ user }),
		);
	});

	it('inherits the parent resource id as the child memory scope when provided', async () => {
		const result = await runner.run(
			{ ...spawnRequest, parentResourceId: 'draft-chat:user-1' },
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: 'draft-chat:user-1',
					threadId: result.threadId,
					delegated: true,
				},
			}),
		);
		expect(result.threadId).toEqual(expect.any(String));
	});

	it('inherits the parent workspace principal on the initial run and resume', async () => {
		const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
		const result = await runner.run(
			{ ...spawnRequest, parentSandboxPrincipalHash: principalHash },
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: expect.objectContaining({
					hostMetadata: encodeAgentSandboxHostMetadata({ projectId, principalHash }),
				}),
			}),
		);

		checkpointStorage.load.mockResolvedValue({
			status: 'suspended',
			persistence: {
				threadId: result.threadId,
				resourceId: result.threadId,
				delegated: true,
				hostMetadata: encodeAgentSandboxHostMetadata({ projectId, principalHash }),
			},
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		});
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: result.threadId,
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
				parentThreadId,
			},
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: principalHash }),
		);
	});

	it('threads the parent workspace handle into child reconstruction with the delegation thread id', async () => {
		const parentWorkspaceHandle = mock<AgentSandboxRuntime>();
		const result = await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			parentWorkspaceHandle,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({
				parentWorkspace: { handle: parentWorkspaceHandle, delegationThreadId: result.threadId },
			}),
		);

		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: result.threadId,
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
				parentThreadId,
			},
			{
				projectId,
				credentialProvider,
				runType: 'production',
				parentWorkspaceHandle,
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenLastCalledWith(
			expect.objectContaining({
				parentWorkspace: { handle: parentWorkspaceHandle, delegationThreadId: result.threadId },
			}),
		);
	});

	it('uses the saved n8n agent id as memory owner and records parent linkage', async () => {
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: {
				sourceId: 'agent-2',
				versionId: 'version-1',
				config: {
					...runnableConfig,
					memory: { enabled: true, storage: 'n8n' },
				},
			},
		});

		const result = await runner.run(
			{
				...spawnRequest,
				source: { agentId: 'agent-2', versionId: 'version-1' },
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				memoryOwnerAgentId: 'agent-2',
				runtimeProfile: 'sub-agent',
				parentAgentIdForDelegation: parentAgentId,
			}),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
					delegated: true,
				},
			}),
		);
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-2',
				agentName: 'Helper Agent',
				projectId,
				source: 'subagent',
				threadMetadata: {
					parentThreadId,
					parentAgentId,
				},
			}),
		);
	});

	it('returns a child suspension with draft resume context', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Choose an option' },
				{
					type: 'tool-call-suspended',
					runId: 'child-run-1',
					toolCallId: 'tool-call-1',
					toolName: 'approval_action',
					input: { action: 'publish' },
					suspendPayload: { type: 'approval', action: 'publish' },
					resumeSchema: {
						type: 'object',
						properties: { approved: { type: 'boolean' } },
					},
				},
				{ type: 'finish', finishReason: 'tool-calls' },
			]),
		);

		await expect(
			runner.run(spawnRequest, {
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'suspended',
			resumeContext: { agentId: 'agent-1' },
			result: {
				runId: 'child-run-1',
				finishReason: 'tool-calls',
				pendingSuspend: [
					{
						runId: 'child-run-1',
						toolCallId: 'tool-call-1',
						toolName: 'approval_action',
						input: { action: 'publish' },
						suspendPayload: { type: 'approval', action: 'publish' },
						resumeSchema: {
							type: 'object',
							properties: { approved: { type: 'boolean' } },
						},
					},
				],
			},
		});
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({ hitlStatus: 'suspended' }),
		);
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it('applies the self-delegation model while preserving the parent draft', async () => {
		const parentConfig: RunnableAgentJsonConfig = {
			...runnableConfig,
			model: 'openai/gpt-4o-mini',
			credential: 'parent-credential',
			instructions: 'Parent instructions.',
			memory: { enabled: true, storage: 'n8n' },
			tools: [{ type: 'custom', id: 'tool_1' }],
			skills: [{ type: 'skill', id: 'skill_1' }],
			config: { webSearch: { enabled: true } },
			providerTools: {
				'anthropic.web_search': { maxUses: 3 },
				'openai.image_generation': {},
			},
			subAgents: {
				modelsByDifficulty: {
					high: {
						model: 'anthropic/claude-sonnet-4-5',
						credential: 'high-credential',
					},
				},
			},
		};
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: { sourceId: parentAgentId, config: parentConfig },
		});

		await runner.run(
			{ ...spawnRequest, source: { agentId: parentAgentId } },
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
				selfDelegationDifficulty: 'high',
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				config: {
					...parentConfig,
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'high-credential',
					providerTools: {
						'anthropic.web_search_20250305': { maxUses: 3 },
					},
				},
				toolDescriptors: runtimeSource.toolDescriptors,
				toolCodeByName: runtimeSource.toolCodeByName,
				skills: runtimeSource.skills,
			}),
		);
	});

	it('resumes a draft child in the same thread', async () => {
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));

		const result = await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: 'child-thread-1',
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1' },
				parentThreadId,
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1' },
			{ projectId, usePublishedVersion: true },
		);
		expect(childAgent.resume).toHaveBeenCalledWith(
			'stream',
			{ approved: true },
			expect.objectContaining({ runId: 'child-run-1', toolCallId: 'tool-call-1' }),
		);
		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			threadId: 'child-thread-1',
			status: 'completed',
			result: { runId: 'child-run-1', finishReason: 'stop' },
		});
		expect(agentExecutionService.finalizeExecution).toHaveBeenCalledWith(
			'agent-execution-1',
			expect.objectContaining({
				threadId: 'child-thread-1',
				agentId: 'agent-1',
				userMessage: null,
				hitlStatus: 'resumed',
				record: expect.objectContaining({
					timeline: expect.arrayContaining([
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tool-call-1',
							response: { approved: true },
						}),
					]),
				}),
			}),
		);
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it('resumes and cancels self-delegation from the parent-owned checkpoint', async () => {
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		const request = {
			...delegatedRequest,
			subAgentId: INLINE_SUB_AGENT_ID,
			difficulty: 'high' as const,
			childRunId: 'child-run-1',
			childToolCallId: 'tool-call-1',
			childThreadId: 'child-thread-1',
			resumeData: { approved: true },
			resumeContext: { agentId: parentAgentId },
			parentThreadId,
		};

		const result = await runner.resumeForeground(
			request,
			{
				projectId,
				parentAgentId,
				credentialProvider,
				runType: 'production',
				selfDelegationDifficulty: 'high',
			},
			parentAgentId,
		);
		await runner.cancelForeground({ ...request, reason: 'Parent run aborted' }, parentAgentId);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: parentAgentId },
			{ projectId, usePublishedVersion: true },
		);
		expect(result.threadId).toBe('child-thread-1');
		expect(checkpointStorage.delete).toHaveBeenCalledWith('child-run-1', parentAgentId);
	});

	it('accepts a legacy pinned resume context', async () => {
		childAgent.resume.mockResolvedValue(makeStreamResult(defaultStreamChunks));

		await runner.resumeForeground(
			{
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				childThreadId: 'child-thread-1',
				resumeData: { approved: true },
				resumeContext: { agentId: 'agent-1', versionId: 'version-7' },
			},
			{
				projectId,
				credentialProvider,
				runType: 'production',
			},
		);

		expect(sourceResolver.resolveForRuntime).toHaveBeenCalledWith(
			{ agentId: 'agent-1', versionId: 'version-7' },
			{ projectId, usePublishedVersion: true },
		);
	});

	it.each([{ agentId: 'agent-1' }, { agentId: 'agent-1', versionId: 'version-7' }])(
		'cancels a child checkpoint from resume context %#',
		async (resumeContext) => {
			await runner.cancelForeground({
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				resumeContext,
				reason: 'Parent run aborted',
			});

			expect(checkpointStorage.delete).toHaveBeenCalledWith('child-run-1', 'agent-1');
			expect(sourceResolver.resolveForRuntime).not.toHaveBeenCalled();
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
			expect(childAgent.resume).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ agentId: 'other-agent' },
		{ agentId: 'agent-1', versionId: '' },
		{ versionId: 'version-7' },
	])('rejects invalid resume context %#', async (resumeContext) => {
		await expect(
			runner.cancelForeground({
				...delegatedRequest,
				childRunId: 'child-run-1',
				childToolCallId: 'tool-call-1',
				resumeContext,
				reason: 'Parent run aborted',
			}),
		).rejects.toThrow('Configured sub-agent resume context is missing or invalid');
		expect(checkpointStorage.delete).not.toHaveBeenCalled();
	});

	it('marks the run as failed when the child result contains an error', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'error', error: new Error('failed') },
				{ type: 'finish', finishReason: 'error' },
			]),
		);

		await expect(
			runner.run(spawnRequest, {
				projectId,
				credentialProvider,
				runType: 'production',
			}),
		).resolves.toMatchObject({
			status: 'failed',
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
	});

	it('aborts the child run when the parent run is cancelled', async () => {
		const parentAbort = new AbortController();
		childAgent.stream.mockImplementation(
			async (_input, options) =>
				await new Promise<StreamResult>((resolve) => {
					const settle = () =>
						resolve(
							makeStreamResult([
								{ type: 'error', error: new Error('aborted') },
								{ type: 'finish', finishReason: 'error' },
							]),
						);
					if (options?.abortSignal?.aborted) settle();
					else options?.abortSignal?.addEventListener('abort', settle, { once: true });
				}),
		);

		const run = runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			abortSignal: parentAbort.signal,
		});

		parentAbort.abort();

		await expect(run).resolves.toMatchObject({ status: 'failed' });
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
	});

	it('derives sub-agent telemetry from the parent context and passes it to the child stream', async () => {
		const parentTelemetry: BuiltTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			functionId: 'parent-agent',
			metadata: { agent_id: 'agent-1', thread_id: 'parent-thread-1' },
		};

		await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
			telemetry: parentTelemetry,
		});

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				telemetry: {
					...parentTelemetry,
					functionId: undefined,
					metadata: { agent_id: 'agent-1', thread_id: 'parent-thread-1', source: 'sub-agent' },
					rootAnchored: false,
				},
			}),
		);
	});

	it('omits telemetry from the child stream call when the parent context has none', async () => {
		await runner.run(spawnRequest, {
			projectId,
			credentialProvider,
			runType: 'production',
		});

		const options = childAgent.stream.mock.calls[0]?.[1];
		expect(options).not.toHaveProperty('telemetry');
	});
});

function makeStreamResult(chunks: StreamChunk[]): StreamResult {
	return {
		runId: 'child-run-1',
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			},
		}),
		getState: () => {
			throw new Error('not implemented');
		},
	};
}
