import type {
	Agent as RuntimeAgent,
	JSONValue,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import {
	N8N_CHAT_INTEGRATION_TYPE,
	type AgentBackgroundJobSignal,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExternalHooks } from '@/external-hooks';
import type { Telemetry } from '@/telemetry';

import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRunTracingService } from '../agent-run-tracing.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../agent-sandbox-principal';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { ToolRegistry } from '../tool-registry';
import type { AgentTurnClaim } from '../agent-turn-queue.service';

const aiConfigMock = mock<AiConfig>({
	modelStreamIdleTimeoutMs: 90_000,
	modelStreamFirstOutputTimeoutMs: 180_000,
});

const backgroundJobSignal: AgentBackgroundJobSignal = {
	tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
};

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const user = mock<User>({ id: userId });
const userPrincipalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId });
const integrationPrincipalHash = hashAgentSandboxPrincipal({
	type: 'integration-thread',
	connectionId: 'credential-1',
	platform: 'slack',
	platformThreadId: 'thread-1',
});
const taskPrincipalHash = hashAgentSandboxPrincipal({ type: 'scheduled-task', taskId: 'task-1' });

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

const telemetryContext = {
	runType: 'test' as const,
	configuration: {
		model: schema.model,
		channels: [],
		tool_types: [],
		tool_count: 0,
		num_skills: 0,
		memory_type: 'none' as const,
	},
};

function makeReadableStream(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
	return new ReadableStream<StreamChunk>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function makeFailingStream(error: Error): ReadableStream<StreamChunk> {
	const chunks: StreamChunk[] = [
		{ type: 'text-start', id: 'text-1' },
		{ type: 'text-delta', id: 'text-1', delta: 'partial answer' },
	];
	let index = 0;

	return new ReadableStream<StreamChunk>({
		pull(controller) {
			const chunk = chunks[index++];
			if (chunk) {
				controller.enqueue(chunk);
				return;
			}

			controller.error(error);
		},
	});
}

function makeRuntime(
	chunks: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }],
	mcpServerAttributions = new Map<string, string>(),
) {
	const toolRegistry: ToolRegistry = new Map();
	return {
		mcpServerAttributions,
		agent: {
			name: 'Runtime Agent',
			snapshot: { model: { provider: 'anthropic', name: 'claude-sonnet-4-5' } },
			stream: vi
				.fn()
				.mockResolvedValue({ runId: 'runtime-run-1', stream: makeReadableStream(chunks) }),
			resume: vi
				.fn()
				.mockResolvedValue({ runId: 'runtime-run-1', stream: makeReadableStream(chunks) }),
			structuredOutput: vi.fn(),
			close: vi.fn(),
		} as unknown as RuntimeAgent & {
			stream: Mock;
			resume: Mock;
			structuredOutput: Mock;
		},
		toolRegistry,
		projectId,
		agentId,
		telemetryConfiguration: telemetryContext.configuration,
		toolAccessCheckedAt: Date.now(),
	};
}

/** A claimed row as the queue service hands it out; the orchestrator must release it. */
function claimFor(
	threadId: string,
	executionId = 'execution-1',
): AgentTurnClaim & { release: Mock; fail: Mock } {
	return {
		executionId,
		threadId,
		abortSignal: new AbortController().signal,
		release: vi.fn(async () => {}),
		fail: vi.fn(async () => {}),
	};
}

function makeService(sandboxEnabled = false) {
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const telemetry = mock<Telemetry>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const integrationMessageContextService = mock<IntegrationMessageContextService>();
	const agentRunTracingService = mock<AgentRunTracingService>();
	const externalHooks = mock<ExternalHooks>();
	const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
		isEnabled: () => sandboxEnabled,
	});
	const agentRepository = mock<AgentRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const bridge = mock<AgentChatBridge>();
	Container.set(ChatIntegrationService, chatIntegrationService);
	chatIntegrationService.getBridge.mockReturnValue(bridge);
	integrationMessageContextService.getLatest.mockResolvedValue({
		integrationConnectionId: 'slack:credential-1',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:other-channel:2' },
		replyTarget: { type: 'thread', threadId: 'slack:channel-1:1' },
		updatedAt: new Date().toISOString(),
	});
	executionService.finalizeExecution.mockResolvedValue('execution-1');
	agentRunTracingService.build.mockResolvedValue(undefined);

	const service = new AgentExecutionOrchestratorService(
		mockLogger(),
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		integrationMessageContextService,
		agentRunTracingService,
		externalHooks,
		agentSandboxRuntimeService,
		agentRepository,
		aiConfigMock,
	);

	return {
		service,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		integrationMessageContextService,
		agentRunTracingService,
		externalHooks,
		agentSandboxRuntimeService,
		agentRepository,
		chatIntegrationService,
		bridge,
	};
}

async function collect(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) chunks.push(chunk);
	return chunks;
}

function makeCheckpoint(
	pendingToolCalls: SerializableAgentState['pendingToolCalls'] = {},
	persistence: SerializableAgentState['persistence'] = {
		threadId: 'thread-1',
		resourceId: 'draft-chat:user-1',
	},
): SerializableAgentState {
	return {
		status: 'suspended',
		persistence,
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls,
	};
}

function delegatedPending(
	toolCallId: string,
	continuation: JSONValue,
): SerializableAgentState['pendingToolCalls'][string] {
	return {
		toolCallId,
		toolName: 'delegate_subagent',
		input: {},
		suspended: true,
		runId: 'run-1',
		resumeSchema: { type: 'object' },
		suspendPayload: { type: 'approval' },
		continuation,
	};
}

describe('AgentExecutionOrchestratorService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		Container.reset();
	});

	it('records into the claimed row, releases the claim after finalize, and stops the runtime when the claim is lost', async () => {
		const { service, executionService } = makeService();
		const claimLost = new AbortController();
		const claim = { ...claimFor('thread-1', 'execution-running'), abortSignal: claimLost.signal };
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime([
			{ type: 'text-delta', id: 'text-1', delta: 'Working' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		await collect(
			service.streamChatResponse({
				claim,
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(executionService.recordTimelineSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				agentId,
				threadId: 'thread-1',
				executionId: 'execution-running',
			}),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Working' }),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
		expect(executionService.finalizeExecution.mock.invocationCallOrder[0]).toBeLessThan(
			claim.release.mock.invocationCallOrder[0],
		);

		const runtimeSignal: AbortSignal = runtime.agent.stream.mock.calls[0][1].abortSignal;
		expect(runtimeSignal.aborted).toBe(false);
		claimLost.abort(new Error('claim lost'));
		expect(runtimeSignal.aborted).toBe(true);
	});

	it('rejects a claim for another thread before anything runs', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime();
		const claim = claimFor('thread-2');

		await expect(
			collect(
				service.streamChatResponse({
					claim,
					getRuntime: async () => runtime,
					agentId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					projectId,
					runType: 'test',
					sandboxPrincipalHash: userPrincipalHash,
				}),
			),
		).rejects.toThrow('does not belong to this thread');

		expect(runtime.agent.stream).not.toHaveBeenCalled();
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ record: expect.objectContaining({ finishReason: 'error' }) }),
		);
		expect(claim.release).toHaveBeenCalledOnce();
	});

	it('does not start the agent after losing its claim during runtime setup', async () => {
		const { service } = makeService();
		const runtime = makeRuntime();
		let resolveRuntime!: (value: typeof runtime) => void;
		const runtimeReady = new Promise<typeof runtime>((resolve) => {
			resolveRuntime = resolve;
		});
		const getRuntime = vi.fn(async () => await runtimeReady);
		const claimLost = new AbortController();
		const claim = { ...claimFor('thread-1'), abortSignal: claimLost.signal };

		const turn = collect(
			service.streamChatResponse({
				claim,
				getRuntime,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);
		await vi.waitFor(() => expect(getRuntime).toHaveBeenCalledOnce());
		claimLost.abort(new OperationalError('claim lost'));
		resolveRuntime(runtime);

		await expect(turn).rejects.toThrow('claim lost');
		expect(runtime.agent.stream).not.toHaveBeenCalled();
		expect(claim.release).toHaveBeenCalledOnce();
	});

	const genieResult: StreamChunk = {
		type: 'tool-result',
		toolCallId: 'tc-1',
		toolName: 'Databricks_Genie_ask',
		output: 'rows',
		mcpServerName: 'Databricks Genie',
	};
	const genieAttribution = new Map([['Databricks Genie', 'Powered by Genie']]);

	it('appends the MCP registry attribution on its own line when a tool of that server returned', async () => {
		const { service, executionService } = makeService();
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);

		const chunks = await collect(
			service.streamChatResponse({
				claim: claimFor('thread-1', 'execution-running'),
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		const attributionIndex = chunks.findIndex(
			(chunk) => chunk.type === 'text-delta' && chunk.delta === '\n\nPowered by Genie',
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');
		expect(attributionIndex).toBeGreaterThan(-1);
		expect(attributionIndex).toBeLessThan(finishIndex);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Answer\n\nPowered by Genie' }),
			}),
		);
	});

	it('appends no attribution when no tool of that server returned a result', async () => {
		const { service, executionService } = makeService();
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				// Same name prefix as an attributed server, but not one of its tools
				{ type: 'tool-result', toolCallId: 'tc-0', toolName: 'web_search', output: [] },
				{ ...genieResult, isError: true },
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			new Map([...genieAttribution, ['web', 'Powered by Web']]),
		);

		const chunks = await collect(
			service.streamChatResponse({
				claim: claimFor('thread-1', 'execution-running'),
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(chunks.filter((chunk) => chunk.type === 'text-delta')).toHaveLength(1);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-running',
			expect.objectContaining({
				record: expect.objectContaining({ assistantResponse: 'Answer' }),
			}),
		);
	});

	it('skips the attribution the model already echoed into its reply', async () => {
		const { service, executionService } = makeService();
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer\n\nPowered by Genie' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);

		await collect(
			service.streamChatResponse({
				claim: claimFor('thread-1', 'execution-running'),
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		const finalizedRecord = executionService.finalizeExecution.mock.calls[0][1].record;
		expect(finalizedRecord.assistantResponse).toBe('Answer\n\nPowered by Genie');
	});

	it('attributes an approval-gated tool on the resumed segment, not on the suspended one', async () => {
		const { service, executionService, checkpointStorage, runtimeCacheService } = makeService();
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const suspended = makeRuntime(
			[
				// A sibling Genie tool already returned; the suspended segment is not the reply
				{ ...genieResult, toolCallId: 'tc-0' },
				{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'Databricks_Genie_ask', input: {} },
				{
					type: 'tool-call-suspended',
					toolCallId: 'tc-1',
					toolName: 'Databricks_Genie_ask',
					runId: 'run-1',
				},
				{ type: 'finish', finishReason: 'tool-calls' },
			],
			genieAttribution,
		);

		const suspendedChunks = await collect(
			service.streamChatResponse({
				claim: claimFor('thread-1', 'execution-running'),
				getRuntime: async () => suspended,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);
		expect(suspendedChunks.some((chunk) => chunk.type === 'text-delta')).toBe(false);

		const resumed = makeRuntime(
			[
				genieResult,
				{ type: 'text-delta', id: 'text-1', delta: 'Answer' },
				{ type: 'finish', finishReason: 'stop' },
			],
			genieAttribution,
		);
		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'resource-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(resumed);

		const resumedChunks = await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { approved: true },
				},
				claimFor('thread-1', 'execution-running'),
			),
		);
		expect(
			resumedChunks.some(
				(chunk) => chunk.type === 'text-delta' && chunk.delta === '\n\nPowered by Genie',
			),
		).toBe(true);
	});

	it('streams chat responses and records suspended executions', async () => {
		const { service, executionService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Choose one' },
			{
				type: 'tool-call-suspended',
				toolCallId: 'tc-1',
				toolName: 'ask_questions',
				runId: 'run-1',
			},
		]);

		const chunks = await collect(
			service.streamChatResponse({
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
				abortSignal: abortController.signal,
				claim: claimFor('thread-1'),
			}),
		);

		expect(chunks.at(-1)?.type).toBe('tool-call-suspended');
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: {
					threadId: 'thread-1',
					resourceId: 'resource-1',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: userPrincipalHash,
					}),
				},
				executionCounter: expect.any(Object),
				abortSignal: expect.any(AbortSignal),
				modelStreamIdleTimeoutMs: 90_000,
				modelStreamFirstOutputTimeoutMs: 180_000,
			}),
		);
		// The caller's signal is one input of the runtime's composed signal.
		const runtimeSignal: AbortSignal = runtime.agent.stream.mock.calls[0][1].abortSignal;
		abortController.abort();
		expect(runtimeSignal.aborted).toBe(true);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: 'hello',
				hitlStatus: 'suspended',
				record: expect.objectContaining({ assistantResponse: 'Choose one' }),
			}),
		);
	});

	it('awaits finalization and notifies onExecutionRecorded with the returned id', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		const onExecutionRecorded = vi.fn();

		await collect(
			service.streamChatResponse({
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
				onExecutionRecorded,
				claim: claimFor('thread-1'),
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalled();
		expect(onExecutionRecorded).toHaveBeenCalledWith('execution-1');
	});

	it('still records the message when onExecutionRecorded is omitted', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		await collect(
			service.streamChatResponse({
				getRuntime: async () => runtime,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
				claim: claimFor('thread-1'),
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalled();
	});

	it('executes in-app chat against the draft runtime with the caller source', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			integrationMessageContextService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForChat(
				{
					agentId,
					projectId,
					message: 'hello',
					user,
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					source: 'instance-ai',
				},
				claimFor('thread-1'),
			),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
			sandboxPrincipalHash: userPrincipalHash,
		});
		expect(integrationMessageContextService.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({
				integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
				platform: N8N_CHAT_INTEGRATION_TYPE,
				target: { type: 'dm', userId, threadId: 'thread-1' },
				interactingUserId: userId,
				updatedAt: expect.any(String),
			}),
		);
		expect(
			integrationMessageContextService.setLatest.mock.invocationCallOrder[0] ?? 0,
		).toBeLessThan(runtime.agent.stream.mock.invocationCallOrder[0] ?? 0);
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				source: 'instance-ai',
				taskId: undefined,
				telemetry: {
					userId,
					runType: 'test',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'instance-ai',
				threadId: 'thread-1',
				modelId: 'anthropic/claude-sonnet-4-5',
			}),
		);
	});

	it('releases the runtime lease when chat message context preparation fails', async () => {
		const { service, runtimeCacheService, integrationMessageContextService } = makeService();
		const runtime = makeRuntime();
		const error = new Error('Failed to save message context');
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		integrationMessageContextService.setLatest.mockRejectedValue(error);

		await expect(
			collect(
				service.executeForChat(
					{
						agentId,
						projectId,
						message: 'hello',
						user,
						memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					},
					claimFor('thread-1'),
				),
			),
		).rejects.toBe(error);

		expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledExactlyOnceWith(runtime.agent);
	});

	it('adds full tool configuration to preview approval payloads only', async () => {
		const { service, runtimeCacheService } = makeService();
		const approvalChunk: StreamChunk = {
			type: 'tool-call-suspended',
			toolCallId: 'tc-1',
			toolName: 'check_ledger',
			runId: 'run-1',
			suspendPayload: {
				type: 'approval',
				toolName: 'check_ledger',
				args: {},
			},
		};
		const previewRuntime = makeRuntime([approvalChunk]);
		previewRuntime.toolRegistry = new Map([
			[
				'check_ledger',
				{
					kind: 'node',
					nodeType: 'n8n-nodes-base.dataTableTool',
					nodeParameters: { resource: 'row', operation: 'get', returnAll: true },
				},
			],
		]);
		const publishedRuntime = makeRuntime([approvalChunk]);
		publishedRuntime.toolRegistry = previewRuntime.toolRegistry;
		runtimeCacheService.getRuntime
			.mockResolvedValueOnce(previewRuntime)
			.mockResolvedValueOnce(publishedRuntime);

		const previewChunks = await collect(
			service.executeForChat(
				{
					agentId,
					projectId,
					message: 'check the ledger',
					user,
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				},
				claimFor('thread-1'),
			),
		);
		const publishedChunks = await collect(
			service.executeForChatPublished(
				{
					agentId,
					projectId,
					message: 'check the ledger',
					memory: { threadId: 'thread-2', resourceId: 'platform-user-1' },
					integrationType: 'slack',
					sandboxPrincipalHash: integrationPrincipalHash,
				},
				claimFor('thread-2'),
			),
		);

		expect(previewChunks[0]).toMatchObject({
			type: 'tool-call-suspended',
			suspendPayload: {
				type: 'approval',
				details: {
					toolName: 'check_ledger',
					input: {},
					node: {
						type: 'n8n-nodes-base.dataTableTool',
						parameters: { resource: 'row', operation: 'get', returnAll: true },
					},
				},
			},
		});
		expect(publishedChunks[0]).toEqual(approvalChunk);
	});

	it('executes published integration chat with integration-scoped runtime', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForChatPublished(
				{
					agentId,
					projectId,
					message: 'from slack',
					modelMessage: '[alice (platform-user-1)]: from slack',
					author: { id: 'platform-user-1', name: 'alice' },
					memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
					integrationType: 'slack',
					sandboxPrincipalHash: integrationPrincipalHash,
				},
				claimFor('thread-1'),
			),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		// The model sees the labelled text; the transcript keeps the plain text and the author.
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'[alice (platform-user-1)]: from slack',
			expect.anything(),
		);
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: 'from slack',
				author: { id: 'platform-user-1', name: 'alice' },
				source: 'slack',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'slack' }),
		);
	});

	it('ends the claimed row as an error execution and rethrows when the published runtime cannot be built', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
		const claim = claimFor('thread-1');
		const buildError = new UserError('Credential "OpenAI" not found');
		runtimeCacheService.getRuntime.mockRejectedValue(buildError);
		// A plain object: `mock<Agent>()` proxies nested fields, which breaks the
		// telemetry builder's array handling of `schema`.
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			name: 'Support Agent (draft)',
			schema: { ...schema, name: 'Support Agent (draft)' },
			activeVersion: { schema },
			integrations: [],
		} as unknown as Agent);

		await expect(
			collect(
				service.executeForChatPublished(
					{
						agentId,
						projectId,
						message: 'from slack',
						memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
						integrationType: 'slack',
						sandboxPrincipalHash: integrationPrincipalHash,
					},
					claim,
				),
			),
		).rejects.toBe(buildError);

		// No runtime: the telemetry describes the stored published configuration.
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: 'from slack',
				source: 'slack',
				telemetry: expect.objectContaining({
					runType: 'production',
					configuration: expect.objectContaining({ model: schema.model }),
				}),
				record: expect.objectContaining({
					finishReason: 'error',
					error: 'Credential "OpenAI" not found',
				}),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
	});

	it('ends the claimed row without telemetry when the agent no longer exists', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
		const buildError = new Error('boom');
		runtimeCacheService.getRuntime.mockRejectedValue(buildError);
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const claim = claimFor('thread-1');

		await expect(
			collect(
				service.executeForTaskPublished(
					{
						agentId,
						projectId,
						message: 'run task',
						memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
						taskId: 'task-1',
						taskVersionId: 'version-1',
					},
					claim,
				),
			),
		).rejects.toBe(buildError);

		expect(executionService.finalizeExecution).toHaveBeenCalledOnce();
		expect(executionService.finalizeExecution.mock.calls[0][1].telemetry).toBeUndefined();
		expect(claim.release).toHaveBeenCalledOnce();
	});

	it('executes published scheduled tasks with task-scoped runtime and metadata', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
			externalHooks,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForTaskPublished(
				{
					agentId,
					projectId,
					message: 'run task',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
					taskVersionId: 'version-1',
				},
				claimFor('thread-1'),
			),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'task',
			usePublishedVersion: true,
			sandboxPrincipalHash: taskPrincipalHash,
			allowBackgroundTasks: false,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				source: 'task',
				taskId: 'task-1',
				taskVersionId: 'version-1',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'task' }),
		);
	});

	it('does not execute a published scheduled task when the agent quota hook rejects it', async () => {
		const { service, runtimeCacheService, externalHooks } = makeService();
		const quotaError = new UserError('Execution quota exhausted');
		externalHooks.run.mockRejectedValue(quotaError);

		await expect(
			collect(
				service.executeForTaskPublished(
					{
						agentId,
						projectId,
						message: 'run task',
						memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
						taskId: 'task-1',
						taskVersionId: 'version-1',
					},
					claimFor('thread-1'),
				),
			),
		).rejects.toBe(quotaError);

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('does not run the quota hook for manually started scheduled tasks', async () => {
		const { service, runtimeCacheService, externalHooks } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForTaskNow(
				{
					agentId,
					projectId,
					user,
					message: 'run task manually',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
				},
				claimFor('thread-1'),
			),
		);

		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith(
			expect.objectContaining({
				sandboxPrincipalHash: userPrincipalHash,
				allowBackgroundTasks: false,
			}),
		);
	});

	it('runs a draft wake without a chat client and hides its input from execution history', async () => {
		const { service, runtimeCacheService, executionService, externalHooks, bridge } = makeService();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Handled the background result.' },
			{ type: 'finish', finishReason: 'stop' },
		]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const abortSignal = new AbortController().signal;
		const claim = claimFor('thread-1');
		const markResultsConsumed = vi.fn(async () => {});

		await service.executeForWake(
			{
				backgroundJobSignal,
				agentId,
				projectId,
				message: '<background-jobs-settled>[]</background-jobs-settled>',
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				identity: { type: 'draft', user, principalHash: userPrincipalHash },
				abortSignal,
				markResultsConsumed,
			},
			claim,
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			usePublishedVersion: false,
			user,
			sandboxPrincipalHash: userPrincipalHash,
		});
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'<background-jobs-settled>[]</background-jobs-settled>',
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: null,
				record: expect.objectContaining({
					assistantResponse: 'Handled the background result.',
					// The signal leads the recorded timeline so the preview shows the tasks.
					timeline: [
						expect.objectContaining({ type: 'background-task-signal', signal: backgroundJobSignal }),
						expect.objectContaining({ type: 'text', content: 'Handled the background result.' }),
					],
				}),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
		expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
		// Draft wakes skip the quota hook.
		expect(externalHooks.run).not.toHaveBeenCalled();
	});

	it.each(['draft', 'published'] as const)(
		'records a failed %s wake without delivering its output',
		async (type) => {
			const { service, runtimeCacheService, executionService, bridge } = makeService();
			const cause = new Error('provider unavailable');
			runtimeCacheService.getRuntime.mockResolvedValue(
				makeRuntime([
					{ type: 'error', error: cause },
					{ type: 'finish', finishReason: 'error' },
				]),
			);
			const claim = claimFor('thread-1');
			const markResultsConsumed = vi.fn(async () => {});

			await expect(
				service.executeForWake(
					{
						backgroundJobSignal,
						agentId,
						projectId,
						message: '<background-jobs-settled>[]</background-jobs-settled>',
						memory: {
							threadId: 'thread-1',
							resourceId: type === 'draft' ? 'draft-chat:user-1' : 'integration:slack:user-1',
						},
						identity:
							type === 'draft'
								? { type, user, principalHash: userPrincipalHash }
								: { type, integrationType: 'slack', principalHash: integrationPrincipalHash },
						abortSignal: new AbortController().signal,
						markResultsConsumed,
					},
					claim,
				),
			).rejects.toBeInstanceOf(OperationalError);

			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({ userMessage: null }),
			);
			expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
			expect(markResultsConsumed).not.toHaveBeenCalled();
			expect(claim.release).toHaveBeenCalledOnce();
			expect(claim.fail).not.toHaveBeenCalled();
		},
	);

	it('delivers a published wake through the stored connection and reply thread', async () => {
		const {
			service,
			runtimeCacheService,
			executionService,
			externalHooks,
			chatIntegrationService,
			bridge,
		} = makeService();
		const chunks: StreamChunk[] = [
			{ type: 'text-delta', id: 'text-1', delta: 'The job is done.' },
			{ type: 'finish', finishReason: 'stop' },
		];
		const runtime = makeRuntime(chunks);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const claim = claimFor('thread-1');
		const markResultsConsumed = vi.fn(async () => {});

		await service.executeForWake(
			{
				backgroundJobSignal,
				agentId,
				projectId,
				message: '<background-jobs-settled>[]</background-jobs-settled>',
				memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
				identity: {
					type: 'published',
					integrationType: 'slack',
					principalHash: integrationPrincipalHash,
				},
				abortSignal: new AbortController().signal,
				markResultsConsumed,
			},
			claim,
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith(agentId, 'slack', 'credential-1');
		expect(bridge.deliverWakeResponse).toHaveBeenCalledWith('slack:channel-1:1', chunks);
		expect(bridge.deliverWakeResponse.mock.invocationCallOrder[0]).toBeLessThan(
			markResultsConsumed.mock.invocationCallOrder[0],
		);
		expect(markResultsConsumed.mock.invocationCallOrder[0]).toBeLessThan(
			executionService.finalizeExecution.mock.invocationCallOrder[0],
		);
		expect(executionService.finalizeExecution.mock.invocationCallOrder[0]).toBeLessThan(
			claim.release.mock.invocationCallOrder[0],
		);
		expect(claim.release).toHaveBeenCalledOnce();
	});

	it.each(['delivery', 'consumption'] as const)(
		'finalizes and releases a wake when %s fails',
		async (failure) => {
			const { service, runtimeCacheService, executionService, bridge } = makeService();
			const runtime = makeRuntime();
			runtimeCacheService.getRuntime.mockResolvedValue(runtime);
			const error = new Error('Wake completion failed');
			const markResultsConsumed = vi.fn(async () => {});
			if (failure === 'delivery') bridge.deliverWakeResponse.mockRejectedValue(error);
			else markResultsConsumed.mockRejectedValue(error);
			const claim = claimFor('thread-1');

			await expect(
				service.executeForWake(
					{
						backgroundJobSignal,
						agentId,
						projectId,
						message: '<background-jobs-settled>[]</background-jobs-settled>',
						memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
						identity: {
							type: 'published',
							integrationType: 'slack',
							principalHash: integrationPrincipalHash,
						},
						abortSignal: new AbortController().signal,
						markResultsConsumed,
					},
					claim,
				),
			).rejects.toBe(error);

			expect(bridge.deliverWakeResponse).toHaveBeenCalledOnce();
			expect(markResultsConsumed).toHaveBeenCalledTimes(failure === 'consumption' ? 1 : 0);
			expect(executionService.finalizeExecution).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					record: expect.objectContaining({ finishReason: 'error' }),
				}),
			);
			expect(runtimeCacheService.releaseRuntimeLease).toHaveBeenCalledWith(runtime.agent);
			expect(claim.release).toHaveBeenCalledOnce();
			expect(claim.fail).not.toHaveBeenCalled();
			expect(executionService.finalizeExecution.mock.invocationCallOrder[0]).toBeLessThan(
				claim.release.mock.invocationCallOrder[0],
			);
		},
	);

	it('finalizes a wake that loses its claim without delivering its results', async () => {
		const { service, runtimeCacheService, executionService, bridge } = makeService();
		const runtime = makeRuntime();
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const claimLost = new AbortController();
		const markResultsConsumed = vi.fn(async () => {});
		const claim = { ...claimFor('thread-1'), abortSignal: claimLost.signal };
		claimLost.abort();

		await expect(
			service.executeForWake(
				{
					backgroundJobSignal,
					agentId,
					projectId,
					message: '<background-jobs-settled>[]</background-jobs-settled>',
					memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
					identity: { type: 'draft', user, principalHash: userPrincipalHash },
					abortSignal: new AbortController().signal,
					markResultsConsumed,
				},
				claim,
			),
		).rejects.toThrow();

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
		expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
		expect(markResultsConsumed).not.toHaveBeenCalled();
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				record: expect.objectContaining({ finishReason: 'error' }),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
		expect(claim.fail).not.toHaveBeenCalled();
	});

	it.each(['context', 'connection'] as const)(
		'does not start a wake when its reply %s is missing',
		async (missing) => {
			const {
				service,
				runtimeCacheService,
				integrationMessageContextService,
				chatIntegrationService,
				bridge,
			} = makeService();
			if (missing === 'context') integrationMessageContextService.getLatest.mockResolvedValue(null);
			else chatIntegrationService.getBridge.mockReturnValue(undefined);
			const claim = claimFor('thread-1');
			const markResultsConsumed = vi.fn(async () => {});

			await expect(
				service.executeForWake(
					{
						backgroundJobSignal,
						agentId,
						projectId,
						message: '<background-jobs-settled>[]</background-jobs-settled>',
						memory: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
						identity: {
							type: 'published',
							integrationType: 'slack',
							principalHash: integrationPrincipalHash,
						},
						abortSignal: new AbortController().signal,
						markResultsConsumed,
					},
					claim,
				),
			).rejects.toBeInstanceOf(OperationalError);

			expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
			expect(bridge.deliverWakeResponse).not.toHaveBeenCalled();
			// The claim never reached the orchestrator's turn, so the wake ends the row itself.
			expect(claim.fail).toHaveBeenCalledWith(expect.any(OperationalError));
			expect(markResultsConsumed).not.toHaveBeenCalled();
		},
	);

	it('adds the max-iterations assistant text before the finish chunk and persists it', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'max-iterations' }]);

		const chunks = await collect(
			service.streamChatResponse({
				getRuntime: async () => runtime,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
				claim: claimFor('thread-1'),
			}),
		);

		const generatedTextIndex = chunks.findIndex(
			(chunk) =>
				chunk.type === 'text-delta' && chunk.delta.includes('maximum number of iterations'),
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');

		expect(generatedTextIndex).toBeGreaterThan(-1);
		expect(generatedTextIndex).toBeLessThan(finishIndex);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				record: expect.objectContaining({
					assistantResponse: expect.stringContaining('maximum number of iterations'),
				}),
			}),
		);
	});

	it('records a failed execution when the stream reader errors before finish', async () => {
		const { service, executionService } = makeService();
		const streamError = new Error('reader failed while consuming stream');
		const runtime = makeRuntime();
		runtime.agent.stream.mockResolvedValue({ stream: makeFailingStream(streamError) });
		const claim = claimFor('thread-1');

		await expect(
			collect(
				service.streamChatResponse({
					getRuntime: async () => runtime,
					agentId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					projectId,
					runType: 'test',
					sandboxPrincipalHash: userPrincipalHash,
					claim,
				}),
			),
		).rejects.toThrow('reader failed while consuming stream');

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				agentId,
				userMessage: 'hello',
				record: expect.objectContaining({
					assistantResponse: 'partial answer',
					finishReason: 'error',
					error: 'reader failed while consuming stream',
				}),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
		expect(executionService.finalizeExecution.mock.invocationCallOrder[0]).toBeLessThan(
			claim.release.mock.invocationCallOrder[0],
		);
	});

	it('persists an aborted chat stream as cancelled without discarding partial output', async () => {
		const { service, executionService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'partial answer' },
			{ type: 'error', error: new Error('This operation was aborted') },
			{ type: 'finish', finishReason: 'error' },
		]);
		const stream = service.streamChatResponse({
			getRuntime: async () => runtime,
			agentId,
			message: 'hello',
			memory: { threadId: 'thread-1', resourceId: 'resource-1' },
			projectId,
			runType: 'test',
			sandboxPrincipalHash: userPrincipalHash,
			abortSignal: abortController.signal,
			onExecutionRecorded: vi.fn(),
			claim: claimFor('thread-1'),
		});

		await stream.next();
		await stream.next();
		abortController.abort();
		await collect(stream);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: 'hello',
				record: expect.objectContaining({
					assistantResponse: 'partial answer',
					finishReason: 'cancelled',
					error: null,
					timeline: [expect.objectContaining({ type: 'text', content: 'partial answer' })],
				}),
			}),
		);
	});

	it('maps persisted execution history to chat DTOs', async () => {
		const { service, executionService } = makeService();
		executionService.getThreadDetail.mockResolvedValue({
			thread: { id: 'thread-1' },
			executions: [
				{
					id: 'execution-1',
					userMessage: 'Hi',
					timeline: [{ type: 'text', content: 'Hello', timestamp: 100 }],
				},
			],
		} as never);

		await expect(
			service.getConversationHistory({ threadId: 'thread-1', projectId, agentId }),
		).resolves.toEqual([
			{
				id: 'execution-1:user',
				executionId: 'execution-1',
				role: 'user',
				content: [{ type: 'text', text: 'Hi' }],
			},
			{
				id: 'execution-1:assistant',
				executionId: 'execution-1',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hello' }],
			},
		]);
	});

	it('rejects expired checkpoints and resumes active checkpoints without passing resourceId', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService, externalHooks } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({ status: 'expired' });
		const expiredClaim = claimFor('thread-1');
		await expect(
			collect(
				service.resumeForChat(
					{
						agentId,
						projectId,
						runId: 'expired-run',
						toolCallId: 'tc-1',
						resumeData: { value: 'yes' },
					},
					expiredClaim,
				),
			),
		).rejects.toThrow(UserError);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('expired-run', agentId);
		// The rejected resume still ends its claimed row.
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ record: expect.objectContaining({ finishReason: 'error' }) }),
		);
		expect(expiredClaim.release).toHaveBeenCalledOnce();

		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		const abortController = new AbortController();
		const order: string[] = [];
		const beforeResume = vi.fn(async () => {
			order.push('side effects');
		});
		runtime.agent.resume.mockImplementationOnce(
			async (
				_mode: unknown,
				_resumeData: unknown,
				options: { onResumeClaimed?: () => Promise<void> },
			) => {
				order.push('checkpoint claimed');
				await options.onResumeClaimed?.();
				order.push('runtime resumed');
				return {
					runId: 'runtime-run-1',
					stream: makeReadableStream([{ type: 'finish', finishReason: 'stop' }]),
				};
			},
		);
		const claim = claimFor('thread-1');
		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
					abortSignal: abortController.signal,
					beforeResume,
				},
				claim,
			),
		);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('run-1', agentId);

		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({
				runId: 'run-1',
				toolCallId: 'tc-1',
				abortSignal: expect.any(AbortSignal),
				onResumeClaimed: expect.any(Function),
			}),
		);
		expect(order).toEqual(['checkpoint claimed', 'side effects', 'runtime resumed']);
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(JSON.stringify(runtime.agent.resume.mock.calls[0])).not.toContain('platform-user-1');
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: null,
				hitlStatus: 'resumed',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
				record: expect.objectContaining({
					timeline: [
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tc-1',
							response: { value: 'yes' },
						}),
					],
				}),
			}),
		);
		expect(claim.release).toHaveBeenCalledOnce();
	});

	it('reconstructs a resumed runtime from the persisted sandbox scope', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		const runtime = makeRuntime();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(
				{},
				{
					threadId: 'thread-1',
					resourceId: 'platform-user-1',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: integrationPrincipalHash,
					}),
				},
			),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				},
				claimFor('thread-1'),
			),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith(
			expect.objectContaining({ sandboxPrincipalHash: integrationPrincipalHash }),
		);
	});

	it('rejects a draft resume when the checkpoint principal differs from the caller', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(
				{},
				{
					threadId: 'thread-1',
					resourceId: 'draft-chat:user-2',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: hashAgentSandboxPrincipal({
							type: 'n8n-user',
							userId: 'user-2',
						}),
					}),
				},
			),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());

		await expect(
			collect(
				service.resumeForChat(
					{
						agentId,
						projectId,
						runId: 'run-1',
						toolCallId: 'tc-1',
						resumeData: { value: 'yes' },
						user,
						usePublishedVersion: false,
						integrationType: N8N_CHAT_INTEGRATION_TYPE,
					},
					claimFor('thread-1'),
				),
			),
		).rejects.toThrow('unavailable');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('rejects an old checkpoint without sandbox scope when workspaces are enabled', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);

		await expect(
			collect(
				service.resumeForChat(
					{
						agentId,
						projectId,
						runId: 'run-1',
						toolCallId: 'tc-1',
						resumeData: { value: 'yes' },
						integrationType: 'slack',
					},
					claimFor('thread-1'),
				),
			),
		).rejects.toThrow('unavailable');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('persists an aborted resumed stream as cancelled without discarding partial output', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
		const abortController = new AbortController();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'partial resumed answer' },
			{ type: 'error', error: new Error('This operation was aborted') },
			{ type: 'finish', finishReason: 'error' },
		]);
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'resource-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const stream = service.resumeForChat(
			{
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				abortSignal: abortController.signal,
				onExecutionRecorded: vi.fn(),
			},
			claimFor('thread-1'),
		);

		await stream.next();
		await stream.next();
		abortController.abort();
		await collect(stream);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: null,
				hitlStatus: 'resumed',
				record: expect.objectContaining({
					assistantResponse: 'partial resumed answer',
					finishReason: 'cancelled',
					error: null,
					timeline: [
						expect.objectContaining({
							type: 'hitl-response',
							toolCallId: 'tc-1',
							response: { value: 'yes' },
						}),
						expect.objectContaining({ type: 'text', content: 'partial resumed answer' }),
					],
				}),
			}),
		);
	});

	it('atomically cancels only suspended checkpoints owned by the preview user', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint();
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(true);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('run-1', agentId);
		expect(checkpointStorage.cancelSuspended).toHaveBeenCalledWith('run-1', checkpoint, agentId);

		checkpointStorage.cancelSuspended.mockClear();
		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:another-user',
			}),
		).resolves.toBe(false);
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
	});

	it('does not resume a checkpoint outside the expected draft memory scope', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint(),
		});

		for (const expectedMemory of [
			{ threadId: 'another-thread', resourceId: 'draft-chat:user-1' },
			{ threadId: 'thread-1', resourceId: 'draft-chat:another-user' },
		]) {
			await expect(
				collect(
					service.resumeForChat(
						{
							agentId,
							projectId,
							runId: 'run-1',
							toolCallId: 'tool-call-1',
							resumeData: { approved: true },
							expectedMemory,
						},
						claimFor('thread-1'),
					),
				),
			).rejects.toThrow('Checkpoint run-1 does not belong to this chat');
		}

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('does not directly cancel or resume a delegated child checkpoint', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService();
		const checkpoint = makeCheckpoint(
			{},
			{
				threadId: 'child-thread-1',
				resourceId: 'draft-chat:user-1',
				delegated: true,
			},
		);
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'child-run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(false);
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
		expect(checkpointStorage.delete).not.toHaveBeenCalled();

		await expect(
			collect(
				service.resumeForChat(
					{
						agentId,
						projectId,
						runId: 'child-run-1',
						toolCallId: 'child-tool-call-1',
						resumeData: { approved: true },
					},
					claimFor('thread-1'),
				),
			),
		).rejects.toThrow('Delegated actions must be resumed through their parent agent');
		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('expires configured and inline child checkpoints when cancelling a suspended parent', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint({
			configured: delegatedPending('configured', {
				runId: 'configured-child-run',
				toolCallId: 'configured-child-call',
				taskPath: '/root/configured_0',
				subAgentId: 'configured-agent',
				childCount: 0,
				threadId: 'configured-child-thread',
				resumeContext: {
					agentId: 'configured-agent',
				},
			}),
			inline: delegatedPending('inline', {
				runId: 'inline-child-run',
				toolCallId: 'inline-child-call',
				taskPath: '/root/inline_1',
				subAgentId: 'inline',
				childCount: 1,
				resumeContext: {
					agentId,
				},
			}),
		});
		checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);

		await expect(
			service.cancelChatRun({
				agentId,
				runId: 'run-1',
				resourceId: 'draft-chat:user-1',
			}),
		).resolves.toBe(true);

		expect(checkpointStorage.delete).toHaveBeenCalledTimes(3);
		expect(checkpointStorage.delete).toHaveBeenCalledWith(
			'configured-child-run',
			'configured-agent',
		);
		expect(checkpointStorage.delete).toHaveBeenCalledWith('inline-child-run', agentId);
		expect(checkpointStorage.delete).toHaveBeenCalledWith('run-1', agentId);
	});

	it('retries child cleanup from retained parent checkpoint references', async () => {
		const { service, checkpointStorage } = makeService();
		const checkpoint = makeCheckpoint({
			delegated: delegatedPending('delegated', {
				runId: 'child-run-1',
				toolCallId: 'child-tool-call-1',
				taskPath: '/root/inline_0',
				subAgentId: 'inline',
				childCount: 0,
			}),
		});
		checkpointStorage.getStatus
			.mockResolvedValueOnce({ status: 'active', checkpoint })
			.mockResolvedValueOnce({ status: 'expired', checkpoint });
		checkpointStorage.cancelSuspended.mockResolvedValue(true);
		checkpointStorage.delete
			.mockRejectedValueOnce(new Error('child checkpoint unavailable'))
			.mockResolvedValue(undefined);

		const request = {
			agentId,
			runId: 'run-1',
			resourceId: 'draft-chat:user-1',
		};
		await expect(service.cancelChatRun(request)).rejects.toThrow('child checkpoint unavailable');
		await expect(service.cancelChatRun(request)).resolves.toBe(true);

		expect(checkpointStorage.cancelSuspended).toHaveBeenCalledOnce();
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(1, 'child-run-1', agentId);
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(2, 'child-run-1', agentId);
		expect(checkpointStorage.delete).toHaveBeenNthCalledWith(3, 'run-1', agentId);
	});

	it('passes tracing telemetry returned by AgentRunTracingService into stream() and resume()', async () => {
		const { service, checkpointStorage, runtimeCacheService, agentRunTracingService } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		const fakeTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
		};
		agentRunTracingService.build.mockResolvedValue(fakeTelemetry as never);

		await collect(
			service.streamChatResponse({
				getRuntime: async () => runtime,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				runType: 'test',
				sandboxPrincipalHash: userPrincipalHash,
				claim: claimFor('thread-1'),
			}),
		);
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({ telemetry: fakeTelemetry }),
		);

		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				},
				claimFor('thread-1'),
			),
		);
		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({ telemetry: fakeTelemetry }),
		);
	});

	it('recovers the original run source from the latest suspended execution when resuming', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce({ source: 'telegram' } as never);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'telegram',
				},
				claimFor('thread-1'),
			),
		);

		expect(executionService.findLatestSuspendedRun).toHaveBeenCalledWith('thread-1');
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'telegram' }),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ source: 'telegram' }),
		);
	});

	it('falls back to source "unknown" when no suspended execution is found on resume', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce(null);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				},
				claimFor('thread-1'),
			),
		);

		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'unknown' }),
		);
	});

	it('skips the suspended-run lookup on resume when tracing is disabled', async () => {
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			agentRunTracingService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		Object.defineProperty(agentRunTracingService, 'enabled', { value: false });
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				},
				claimFor('thread-1'),
			),
		);

		expect(executionService.findLatestSuspendedRun).not.toHaveBeenCalled();
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'unknown' }),
		);
	});

	it('records resumed chat executions as suspended when they suspend again', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
		const runtime = makeRuntime([
			{
				type: 'tool-call-suspended',
				toolCallId: 'tc-2',
				toolName: 'ask_questions',
				runId: 'run-2',
			},
		]);

		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: makeCheckpoint({}, { threadId: 'thread-1', resourceId: 'platform-user-1' }),
		});
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat(
				{
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				},
				claimFor('thread-1'),
			),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ threadId: 'thread-1', userMessage: null, hitlStatus: 'suspended' }),
		);
	});
});
