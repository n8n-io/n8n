import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import { N8N_CHAT_INTEGRATION_TYPE, type AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExternalHooks } from '@/external-hooks';
import type { Telemetry } from '@/telemetry';

import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRunTracingService } from '../agent-run-tracing.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const user = mock<User>({ id: userId });

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
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
	return {
		agent: {
			name: 'Runtime Agent',
			snapshot: { model: { provider: 'anthropic', name: 'claude-sonnet-4-5' } },
			stream: vi.fn().mockResolvedValue({ stream: makeReadableStream(chunks) }),
			resume: vi.fn().mockResolvedValue({ stream: makeReadableStream(chunks) }),
			structuredOutput: vi.fn(),
			close: vi.fn(),
		} as unknown as RuntimeAgent & {
			stream: Mock;
			resume: Mock;
			structuredOutput: Mock;
		},
		toolRegistry: mock<ToolRegistry>(),
		projectId,
		agentId,
		telemetryConfiguration: {
			model: schema.model,
			channels: [],
			tool_types: [],
			tool_count: 0,
			num_skills: 0,
			memory_type: 'none' as const,
		},
	};
}

function makeService() {
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const telemetry = mock<Telemetry>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const integrationMessageContextService = mock<IntegrationMessageContextService>();
	const agentRunTracingService = mock<AgentRunTracingService>();
	const externalHooks = mock<ExternalHooks>();

	executionService.recordMessage.mockResolvedValue('execution-1');
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
	};
}

async function collect(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) chunks.push(chunk);
	return chunks;
}

describe('AgentExecutionOrchestratorService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('streams chat responses and records suspended executions', async () => {
		const { service, executionService } = makeService();
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
			}),
		);

		expect(chunks.at(-1)?.type).toBe('tool-call-suspended');
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
				executionCounter: expect.any(Object),
			}),
		);
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: 'hello',
				hitlStatus: 'suspended',
				record: expect.objectContaining({ assistantResponse: 'Choose one' }),
			}),
		);
	});

	it('awaits recordMessage and notifies onExecutionRecorded with the returned id', async () => {
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
				onExecutionRecorded,
			}),
		);

		expect(executionService.recordMessage).toHaveBeenCalled();
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
			}),
		);

		expect(executionService.recordMessage).toHaveBeenCalled();
	});

	it('executes in-app chat against the draft runtime', async () => {
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
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
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
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
			}),
		);
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				source: undefined,
				taskId: undefined,
				telemetry: {
					runType: 'test',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
		// In-app test chat has no `source` — the tracing metadata normalizes it
		// to 'test', distinct from the (unrelated) analytics `source` above.
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'test',
				threadId: 'thread-1',
				modelId: 'anthropic/claude-sonnet-4-5',
			}),
		);
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
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			integrationType: 'slack',
			usePublishedVersion: true,
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.recordMessage).toHaveBeenCalledWith(
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
		});
		expect(externalHooks.run).toHaveBeenCalledWith('agent.preExecute', [agentId]);
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		expect(externalHooks.run.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
			runtimeCacheService.getRuntime.mock.invocationCallOrder[0] ?? 0,
		);
		expect(executionService.recordMessage).toHaveBeenCalledWith(
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
			}),
		);

		const generatedTextIndex = chunks.findIndex(
			(chunk) =>
				chunk.type === 'text-delta' && chunk.delta.includes('maximum number of iterations'),
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');

		expect(generatedTextIndex).toBeGreaterThan(-1);
		expect(generatedTextIndex).toBeLessThan(finishIndex);
		expect(executionService.recordMessage).toHaveBeenCalledWith(
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
				}),
			),
		).rejects.toThrow('reader failed while consuming stream');

		expect(executionService.recordMessage).toHaveBeenCalledWith(
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
			expect.objectContaining({ runId: 'run-1', toolCallId: 'tc-1' }),
		);
		expect(externalHooks.run).not.toHaveBeenCalled();
		expect(JSON.stringify(runtime.agent.resume.mock.calls[0])).not.toContain('platform-user-1');
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: null,
				hitlStatus: 'resumed',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
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

		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'thread-1', userMessage: null, hitlStatus: 'suspended' }),
		);
	});
});
