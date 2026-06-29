import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import { N8N_CHAT_INTEGRATION_TYPE, type AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { JSONSchema7 } from 'json-schema';
import { OperationalError, UserError } from 'n8n-workflow';
import type { ExecuteAgentWorkflowContext, IRunExecutionData } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { Agent } from '../entities/agent.entity';
import type { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		name: 'Support Agent',
		projectId,
		schema,
		activeVersionId: 'published-version',
		activeVersion: { schema, tools: {}, skills: {}, publishedById: userId },
		tools: {},
		skills: {},
		...overrides,
	} as unknown as Agent;
}

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
	const agentRepository = mock<AgentRepository>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const telemetry = mock<Telemetry>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const credentialsService = mock<CredentialsService>();
	const reconstructionService = mock<AgentRuntimeReconstructionService>();
	const integrationMessageContextService = mock<IntegrationMessageContextService>();

	executionService.recordMessage.mockResolvedValue('execution-1');

	const service = new AgentExecutionOrchestratorService(
		mockLogger(),
		agentRepository,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		credentialsService,
		reconstructionService,
		integrationMessageContextService,
	);

	return {
		service,
		agentRepository,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		reconstructionService,
		integrationMessageContextService,
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
			{ type: 'tool-call-suspended', toolCallId: 'tc-1', toolName: 'ask_question', runId: 'run-1' },
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

	it('executes in-app chat against the draft runtime', async () => {
		const { service, runtimeCacheService, executionService, integrationMessageContextService } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.executeForChat({
				agentId,
				projectId,
				message: 'hello',
				userId,
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
			}),
		);

		expect(runtimeCacheService.getRuntime).toHaveBeenCalledWith({
			agentId,
			projectId,
			n8nUserId: userId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
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
	});

	it('executes published integration chat with integration-scoped runtime', async () => {
		const { service, runtimeCacheService, executionService } = makeService();
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
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'slack',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
	});

	it('executes published scheduled tasks with task-scoped runtime and metadata', async () => {
		const { service, runtimeCacheService, executionService } = makeService();
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
			executions: [{ id: 'execution-1', userMessage: 'Hi', assistantResponse: 'Hello' }],
		} as never);

		await expect(
			service.getConversationHistory({ threadId: 'thread-1', projectId, agentId }),
		).resolves.toEqual([
			{ id: 'execution-1:user', role: 'user', content: [{ type: 'text', text: 'Hi' }] },
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hello' }],
			},
		]);
	});

	it('rejects expired checkpoints and resumes active checkpoints without passing resourceId', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
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
		expect(JSON.stringify(runtime.agent.resume.mock.calls[0])).not.toContain('platform-user-1');
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: '',
				hitlStatus: 'resumed',
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
			}),
		);
	});

	it('records resumed chat executions as suspended when they suspend again', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
		const runtime = makeRuntime([
			{
				type: 'tool-call-suspended',
				toolCallId: 'tc-2',
				toolName: 'ask_question',
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
			expect.objectContaining({ threadId: 'thread-1', userMessage: '', hitlStatus: 'suspended' }),
		);
	});

	it('executes workflow runs with execution-scoped persistence and tool-call output', async () => {
		const { service, agentRepository, reconstructionService, executionService, telemetry } =
			makeService();
		const runtime = makeRuntime([
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: { id: 1 } },
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'lookup', output: { ok: true } },
			{ type: 'finish', finishReason: 'stop', structuredOutput: { answer: 'done' } },
		]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		const result = await service.executeForWorkflow(
			agentId,
			'hello',
			'execution-1',
			'thread-1',
			userId,
			projectId,
			userId,
		);

		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: { resourceId: 'execution-1', threadId: 'thread-1' },
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				response: '',
				structuredOutput: { answer: 'done' },
				toolCalls: [{ toolName: 'lookup', input: { id: 1 }, result: { ok: true } }],
			}),
		);

		const streamOptions = runtime.agent.stream.mock.calls[0][1] as {
			executionCounter: { incrementMessageCount: () => void };
		};
		streamOptions.executionCounter.incrementMessageCount();
		expect(telemetry.trackAgentExecution).toHaveBeenCalledWith({
			agent_id: agentId,
			user_id: userId,
			message_count: 1,
		});
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				telemetry: expect.objectContaining({
					runType: 'production',
					configuration: expect.objectContaining({
						model: 'anthropic/claude-sonnet-4-5',
					}),
				}),
			}),
		);
	});

	it('applies per-call structured output schema and improves empty-output errors', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const outputSchema: JSONSchema7 = {
			type: 'object',
			properties: { answer: { type: 'string' } },
		};
		const runtime = makeRuntime([{ type: 'error', error: new Error('No output generated.') }]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		await expect(
			service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				userId,
				false,
				outputSchema,
			),
		).rejects.toThrow(OperationalError);
		expect(runtime.agent.structuredOutput).toHaveBeenCalledWith(outputSchema);
	});

	describe('workflow data tools', () => {
		const baseContext = {
			workflowId: 'wf-1',
			workflowName: 'My workflow',
			callingNodeName: 'Message an Agent',
			inputData: [{ json: { a: 1 } }],
			inputDataScope: 'item' as const,
			nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
			runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
		};

		const setupRuntimeWithToolSpy = (declaredTools: Array<{ name: string }> = []) => {
			const { service, agentRepository, reconstructionService } = makeService();
			const runtime = makeRuntime();
			const toolFn = vi.fn();
			Object.assign(runtime.agent, { tool: toolFn, declaredTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
			return { service, toolFn };
		};

		const toolNamesFrom = (toolFn: Mock): string[] => {
			const [tools] = toolFn.mock.calls[0] as [Array<{ name: string }>];
			return tools.map((t) => t.name);
		};

		it('always injects fetch_input_data when workflowContext is provided', async () => {
			const { service, toolFn } = setupRuntimeWithToolSpy();
			const workflowContext: ExecuteAgentWorkflowContext = {
				...baseContext,
				exposeWorkflowData: false,
			};

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				undefined,
				undefined,
				undefined,
				workflowContext,
			);

			expect(toolFn).toHaveBeenCalledTimes(1);
			expect(toolNamesFrom(toolFn)).toEqual(['fetch_input_data']);
		});

		it('also injects fetch_workflow_context when exposeWorkflowData is true', async () => {
			const { service, toolFn } = setupRuntimeWithToolSpy();
			const workflowContext: ExecuteAgentWorkflowContext = {
				...baseContext,
				exposeWorkflowData: true,
			};

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				undefined,
				undefined,
				undefined,
				workflowContext,
			);

			expect(toolNamesFrom(toolFn)).toEqual(['fetch_input_data', 'fetch_workflow_context']);
		});

		it('injects no tools without workflowContext', async () => {
			const { service, toolFn } = setupRuntimeWithToolSpy();

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
			);

			expect(toolFn).not.toHaveBeenCalled();
		});

		it('surfaces an error when the agent already declares a reserved tool name', async () => {
			const { service, toolFn } = setupRuntimeWithToolSpy([{ name: 'fetch_input_data' }]);
			const workflowContext: ExecuteAgentWorkflowContext = {
				...baseContext,
				exposeWorkflowData: false,
			};

			await expect(
				service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
					undefined,
					undefined,
					undefined,
					workflowContext,
				),
			).rejects.toThrow('"fetch_input_data"');

			expect(toolFn).not.toHaveBeenCalled();
		});
	});

	it('maps structured-output stream reader errors before recording and rethrowing', async () => {
		const { service, agentRepository, reconstructionService, executionService } = makeService();
		const outputSchema: JSONSchema7 = {
			type: 'object',
			properties: { answer: { type: 'string' } },
		};
		const runtime = makeRuntime();
		runtime.agent.stream.mockResolvedValue({
			stream: makeFailingStream(new Error('No output generated. Check the stream for errors.')),
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		const execution = service.executeForWorkflow(
			agentId,
			'hello',
			'execution-1',
			'thread-1',
			userId,
			projectId,
			userId,
			false,
			outputSchema,
		);

		await expect(execution).rejects.toThrow(OperationalError);
		await expect(execution).rejects.toThrow("Couldn't get structured output matching the schema");
		await expect(execution).rejects.not.toThrow('Check the stream');
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				record: expect.objectContaining({
					error: expect.stringContaining("Couldn't get structured output matching the schema"),
				}),
			}),
		);
	});
});
