import type {
	Agent as RuntimeAgent,
	JSONValue,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import { N8N_CHAT_INTEGRATION_TYPE, type AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
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
import { AgentWakeService } from '../background/agent-wake.service';
import type { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const user = mock<User>({ id: userId });
const userPrincipalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId });
const integrationPrincipalHash = hashAgentSandboxPrincipal({
	type: 'integration-user',
	connectionId: 'credential-1',
	platform: 'slack',
	platformUserId: 'platform-user-1',
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

function makeRuntime(chunks: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }]) {
	const toolRegistry: ToolRegistry = new Map();
	return {
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
	// The orchestrator resolves the wake service lazily through the container.
	const wakeService = mock<AgentWakeService>();
	Container.set(AgentWakeService, wakeService);

	executionService.startExecutionRecording.mockResolvedValue('execution-1');
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
		wakeService,
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

	it('starts durable recording before consuming timeline events and finalizes the same row', async () => {
		const { service, executionService } = makeService();
		executionService.startExecutionRecording.mockResolvedValue('execution-running');
		executionService.finalizeExecution.mockResolvedValue('execution-running');
		const runtime = makeRuntime([
			{ type: 'text-delta', id: 'text-1', delta: 'Working' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		await collect(
			service.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);

		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'thread-1', userMessage: 'hello' }),
			expect.any(Date),
		);
		expect(executionService.startExecutionRecording.mock.invocationCallOrder[0]).toBeLessThan(
			executionService.recordTimelineSnapshot.mock.invocationCallOrder[0],
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
		const startedAt = executionService.startExecutionRecording.mock.calls[0][1];
		const finalizedRecord = executionService.finalizeExecution.mock.calls[0][1].record;
		expect(startedAt.getTime()).toBe(finalizedRecord.startTime);
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
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
				abortSignal: abortController.signal,
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
				abortSignal: abortController.signal,
			}),
		);
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
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
				onExecutionRecorded,
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
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
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
			service.executeForChat({
				agentId,
				projectId,
				message: 'hello',
				user,
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				source: 'instance-ai',
			}),
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
			service.executeForChat({
				agentId,
				projectId,
				message: 'check the ledger',
				user,
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
			}),
		);
		const publishedChunks = await collect(
			service.executeForChatPublished({
				agentId,
				projectId,
				message: 'check the ledger',
				memory: { threadId: 'thread-2', resourceId: 'platform-user-1' },
				integrationType: 'slack',
				sandboxPrincipalHash: integrationPrincipalHash,
			}),
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
			service.executeForChatPublished({
				agentId,
				projectId,
				message: 'from slack',
				memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
				integrationType: 'slack',
				sandboxPrincipalHash: integrationPrincipalHash,
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
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

	it('records a failed session and rethrows when the published runtime cannot be built', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
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
				service.executeForChatPublished({
					agentId,
					projectId,
					message: 'from slack',
					memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
					integrationType: 'slack',
					sandboxPrincipalHash: integrationPrincipalHash,
				}),
			),
		).rejects.toBe(buildError);

		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId,
				agentName: 'Support Agent',
				threadId: 'thread-1',
				userMessage: 'from slack',
				source: 'slack',
				telemetry: expect.objectContaining({ runType: 'production' }),
			}),
			expect.any(Date),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				record: expect.objectContaining({
					finishReason: 'error',
					error: 'Credential "OpenAI" not found',
				}),
			}),
		);
	});

	it('rethrows the build error without recording when the agent no longer exists', async () => {
		const { service, runtimeCacheService, executionService, agentRepository } = makeService();
		const buildError = new Error('boom');
		runtimeCacheService.getRuntime.mockRejectedValue(buildError);
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			collect(
				service.executeForTaskPublished({
					agentId,
					projectId,
					message: 'run task',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			),
		).rejects.toBe(buildError);

		expect(executionService.startExecutionRecording).not.toHaveBeenCalled();
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
			service.executeForTaskPublished({
				agentId,
				projectId,
				message: 'run task',
				memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
				taskId: 'task-1',
				taskVersionId: 'version-1',
			}),
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
				service.executeForTaskPublished({
					agentId,
					projectId,
					message: 'run task',
					memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			),
		).rejects.toBe(quotaError);

		expect(runtimeCacheService.getRuntime).not.toHaveBeenCalled();
	});

	it('does not run the quota hook for manually started scheduled tasks', async () => {
		const { service, runtimeCacheService, externalHooks } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForTaskNow({
				agentId,
				projectId,
				user,
				message: 'run task manually',
				memory: { threadId: 'thread-1', resourceId: 'task-run-1' },
				taskId: 'task-1',
			}),
		);

		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith(
			expect.objectContaining({
				sandboxPrincipalHash: userPrincipalHash,
				allowBackgroundTasks: false,
			}),
		);
	});

	it('asks for pending background mail after a chat turn and tolerates a failing request', async () => {
		const first = makeService();
		first.runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());

		await collect(
			first.service.executeForChat({
				agentId,
				projectId,
				message: 'hello',
				user,
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			}),
		);

		expect(first.wakeService.onParentTurnFinished).toHaveBeenCalledWith('thread-1');

		const failing = makeService();
		failing.runtimeCacheService.getRuntime.mockResolvedValue(makeRuntime());
		failing.wakeService.onParentTurnFinished.mockRejectedValue(new Error('wake down'));

		await expect(
			collect(
				failing.service.executeForChat({
					agentId,
					projectId,
					message: 'hello',
					user,
					memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				}),
			),
		).resolves.toEqual(expect.any(Array));
	});

	it('runs a draft wake headlessly and hides its synthetic input from execution history', async () => {
		const { service, runtimeCacheService, executionService, externalHooks, wakeService } =
			makeService();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Handled the background result.' },
			{ type: 'finish', finishReason: 'stop' },
		]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const abortSignal = new AbortController().signal;

		await service.executeForWake({
			agentId,
			projectId,
			message: '<background-jobs-settled>[]</background-jobs-settled>',
			memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			identity: { type: 'draft', user, principalHash: userPrincipalHash },
			abortSignal,
		});

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
			expect.objectContaining({ abortSignal }),
		);
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ userMessage: null }),
			expect.any(Date),
		);
		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({
				userMessage: null,
				record: expect.objectContaining({
					assistantResponse: 'Handled the background result.',
				}),
			}),
		);
		// A draft wake is a test run: no quota hook, and it must not chain another wake.
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
	});

	it('rejects a wake whose model run ended with an error but still records the execution', async () => {
		const { service, runtimeCacheService, executionService, wakeService } = makeService();
		const cause = new Error('provider unavailable');
		runtimeCacheService.getRuntime.mockResolvedValue(
			makeRuntime([
				{ type: 'error', error: cause },
				{ type: 'finish', finishReason: 'error' },
			]),
		);

		await expect(
			service.executeForWake({
				agentId,
				projectId,
				message: '<background-jobs-settled>[]</background-jobs-settled>',
				memory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
				identity: { type: 'draft', user, principalHash: userPrincipalHash },
				abortSignal: new AbortController().signal,
			}),
		).rejects.toBeInstanceOf(OperationalError);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ userMessage: null }),
		);
		expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
	});

	it('uses the published runtime for an integration wake', async () => {
		const { service, runtimeCacheService, externalHooks } = makeService();
		const runtime = makeRuntime();
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await service.executeForWake({
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
		});

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
			sandboxPrincipalHash: integrationPrincipalHash,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
	});

	it('adds the max-iterations assistant text before the finish chunk and persists it', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'max-iterations' }]);

		const chunks = await collect(
			service.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
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

		await expect(
			collect(
				service.streamChatResponse({
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					agentId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'resource-1' },
					projectId,
					telemetry: telemetryContext,
					sandboxPrincipalHash: userPrincipalHash,
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
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message: 'hello',
			memory: { threadId: 'thread-1', resourceId: 'resource-1' },
			projectId,
			telemetry: telemetryContext,
			sandboxPrincipalHash: userPrincipalHash,
			abortSignal: abortController.signal,
			onExecutionRecorded: vi.fn(),
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
		const {
			service,
			checkpointStorage,
			runtimeCacheService,
			executionService,
			externalHooks,
			wakeService,
		} = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({ status: 'expired' });
		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'expired-run',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
				}),
			),
		).rejects.toThrow(UserError);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('expired-run', agentId);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		const abortController = new AbortController();
		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
				abortSignal: abortController.signal,
			}),
		);
		expect(checkpointStorage.getStatus).toHaveBeenLastCalledWith('run-1', agentId);

		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({
				runId: 'run-1',
				toolCallId: 'tc-1',
				abortSignal: abortController.signal,
			}),
		);
		expect(externalHooks.run).not.toHaveBeenCalled();
		// Mail that settled while the parent waited for approval is delivered after the resumed turn.
		expect(wakeService.onParentTurnFinished).toHaveBeenCalledWith('thread-1');
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
	});

	it('reconstructs a resumed runtime from the persisted sandbox scope', async () => {
		const { service, checkpointStorage, runtimeCacheService } = makeService(true);
		const runtime = makeRuntime();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: {
				persistence: {
					threadId: 'thread-1',
					resourceId: 'platform-user-1',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: integrationPrincipalHash,
					}),
				},
			},
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
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
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					user,
					usePublishedVersion: false,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
				}),
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
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
					integrationType: 'slack',
				}),
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
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		const stream = service.resumeForChat({
			agentId,
			projectId,
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { value: 'yes' },
			abortSignal: abortController.signal,
			onExecutionRecorded: vi.fn(),
		});

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
					service.resumeForChat({
						agentId,
						projectId,
						runId: 'run-1',
						toolCallId: 'tool-call-1',
						resumeData: { approved: true },
						expectedMemory,
					}),
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
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'child-run-1',
					toolCallId: 'child-tool-call-1',
					resumeData: { approved: true },
				}),
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
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
				telemetry: telemetryContext,
				sandboxPrincipalHash: userPrincipalHash,
			}),
		);
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({ telemetry: fakeTelemetry }),
		);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
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

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce({ source: 'telegram' } as never);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'telegram',
			}),
		);

		expect(executionService.findLatestSuspendedRun).toHaveBeenCalledWith('thread-1');
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'telegram' }),
		);
		expect(executionService.startExecutionRecording).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'telegram' }),
			expect.any(Date),
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

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);
		executionService.findLatestSuspendedRun.mockResolvedValueOnce(null);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
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
		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
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

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(executionService.finalizeExecution).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ threadId: 'thread-1', userMessage: null, hitlStatus: 'suspended' }),
		);
	});
});
