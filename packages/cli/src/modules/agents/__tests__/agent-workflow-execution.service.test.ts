import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { JSONSchema7 } from 'json-schema';
import { OperationalError, UserError } from 'n8n-workflow';
import type { ExecuteAgentWorkflowContext, IRunExecutionData } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { AgentWorkflowExecutionService } from '../agent-workflow-execution.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRunTracingService } from '../agent-run-tracing.service';
import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { Agent } from '../entities/agent.entity';
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
	const executionService = mock<AgentExecutionService>();
	const telemetry = mock<Telemetry>();
	const credentialsService = mock<CredentialsService>();
	const reconstructionService = mock<AgentRuntimeReconstructionService>();
	const agentRunTracingService = mock<AgentRunTracingService>();

	executionService.recordMessage.mockResolvedValue('execution-1');
	agentRunTracingService.build.mockResolvedValue(undefined);

	const service = new AgentWorkflowExecutionService(
		mockLogger(),
		agentRepository,
		executionService,
		telemetry,
		credentialsService,
		reconstructionService,
		agentRunTracingService,
	);

	return {
		service,
		agentRepository,
		executionService,
		telemetry,
		reconstructionService,
		agentRunTracingService,
	};
}

describe('AgentWorkflowExecutionService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('executes workflow runs with thread-scoped persistence and tool-call output', async () => {
		const {
			service,
			agentRepository,
			reconstructionService,
			executionService,
			telemetry,
			agentRunTracingService,
		} = makeService();
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
			projectId,
			userId,
		);

		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				// resourceId is the memory store's read scope: it must be stable
				// across executions (NOT the execution id) or a reused session id
				// would never see its prior messages.
				persistence: { resourceId: 'thread-1', threadId: 'thread-1' },
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
		expect(agentRunTracingService.build).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId,
				projectId,
				threadId: 'thread-1',
				userId,
				source: 'workflow',
				executionId: 'execution-1',
			}),
		);
	});

	it('omits the telemetry option from stream() when AgentRunTracingService.build resolves undefined', async () => {
		const { service, agentRepository, reconstructionService, agentRunTracingService } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		agentRunTracingService.build.mockResolvedValue(undefined);

		await service.executeForWorkflow(agentId, 'hello', 'execution-1', 'thread-1', projectId);

		const [, options] = runtime.agent.stream.mock.calls[0] as [string, Record<string, unknown>];
		expect(options).not.toHaveProperty('telemetry');
	});

	it('passes the telemetry option to stream() when AgentRunTracingService.build resolves a value', async () => {
		const { service, agentRepository, reconstructionService, agentRunTracingService } =
			makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
		const fakeTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
		};

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		agentRunTracingService.build.mockResolvedValue(fakeTelemetry as never);

		await service.executeForWorkflow(agentId, 'hello', 'execution-1', 'thread-1', projectId);

		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({ telemetry: fakeTelemetry }),
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
			callingNodeId: 'node-1',
			inputData: [{ json: { a: 1 } }],
			inputDataScope: 'item' as const,
			nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
			runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
		};

		const setupRuntimeWithToolSpy = (declaredTools: Array<{ name: string }> = []) => {
			const { service, agentRepository, reconstructionService, agentRunTracingService } =
				makeService();
			const runtime = makeRuntime();
			const toolFn = vi.fn();
			Object.assign(runtime.agent, { tool: toolFn, declaredTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
			return { service, toolFn, agentRunTracingService };
		};

		const toolNamesFrom = (toolFn: Mock): string[] => {
			const [tools] = toolFn.mock.calls[0] as [Array<{ name: string }>];
			return tools.map((t) => t.name);
		};

		it('always injects fetch_input_data when workflowContext is provided', async () => {
			const { service, toolFn, agentRunTracingService } = setupRuntimeWithToolSpy();
			const workflowContext: ExecuteAgentWorkflowContext = {
				...baseContext,
				exposeWorkflowData: false,
			};

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				projectId,
				undefined,
				undefined,
				undefined,
				workflowContext,
			);

			expect(toolFn).toHaveBeenCalledTimes(1);
			expect(toolNamesFrom(toolFn)).toEqual(['fetch_input_data']);
			// Workflow-only correlation IDs land on the tracing metadata, keyed off
			// the workflow context's workflowId/callingNodeId.
			expect(agentRunTracingService.build).toHaveBeenCalledWith(
				expect.objectContaining({
					source: 'workflow',
					workflowId: 'wf-1',
					nodeId: 'node-1',
				}),
			);
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

			await service.executeForWorkflow(agentId, 'hello', 'execution-1', 'thread-1', projectId);

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

	describe('executeInlineForWorkflow', () => {
		const inlinePayload = {
			config: {
				name: 'Inline Agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'cred-1',
				instructions: 'Help users',
			},
		};

		it('compiles from the embedded config, records no session, and tracks inline telemetry', async () => {
			const {
				service,
				agentRepository,
				reconstructionService,
				executionService,
				telemetry,
				agentRunTracingService,
			} = makeService();
			const runtime = makeRuntime([
				{ type: 'text-start', id: 'text-1' },
				{ type: 'text-delta', id: 'text-1', delta: 'answer' },
				{ type: 'text-end', id: 'text-1' },
				{ type: 'finish', finishReason: 'stop' },
			]);
			reconstructionService.reconstructFromResolvedSource.mockResolvedValue(runtime);

			const workflowContext: ExecuteAgentWorkflowContext = {
				workflowId: 'wf-1',
				callingNodeName: 'Message an Agent',
				callingNodeId: 'node-1',
				// Memory is injected only for caller-supplied session ids.
				hasCallerSessionId: true,
				nodes: [],
				runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
			};
			Object.assign(runtime.agent, { tool: vi.fn(), declaredTools: [] });

			const result = await service.executeInlineForWorkflow(
				inlinePayload,
				'hello',
				'execution-1',
				'thread-1',
				projectId,
				userId,
				'production',
				undefined,
				workflowContext,
			);

			// No entity lookup — the embedded config is the source of truth.
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
			expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({
						name: 'Inline Agent',
						// Injected server-side: conversation-thread memory keeps a
						// session-id-keyed thread across executions; long-term memory
						// stays off (it would accumulate under the synthetic id).
						memory: {
							enabled: true,
							storage: 'n8n',
							observationalMemory: { enabled: false },
							episodicMemory: { enabled: false },
						},
					}),
					memoryOwnerAgentId: 'inline:wf-1:Message an Agent',
					projectId,
					runtimeProfile: 'inline',
					skills: {},
					toolDescriptors: {},
					toolCodeByName: {},
				}),
			);

			expect(result.response).toBe('answer');
			// Inline runs have no persisted session.
			expect(result.session).toBeNull();
			expect(executionService.recordMessage).not.toHaveBeenCalled();

			// Thread-scoped persistence: stable across executions, so a reused
			// session id continues the same conversation.
			expect(runtime.agent.stream).toHaveBeenCalledWith(
				'hello',
				expect.objectContaining({
					persistence: { resourceId: 'thread-1', threadId: 'thread-1' },
				}),
			);

			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({
					agent_id: 'inline:wf-1:Message an Agent',
					agent_type: 'inline',
					run_type: 'production',
					turn_status: 'succeeded',
					configuration: expect.objectContaining({ model: 'anthropic/claude-sonnet-4-5' }),
				}),
			);
			// Inline workflow-invoked runs get the same 'workflow' tracing as
			// entity-backed ones, keyed off the synthetic inline agent id.
			expect(agentRunTracingService.build).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'inline:wf-1:Message an Agent',
					source: 'workflow',
					workflowId: 'wf-1',
					nodeId: 'node-1',
				}),
			);
		});

		it('injects no memory when the caller supplied no session id (nothing to continue)', async () => {
			const { service, reconstructionService } = makeService();
			const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
			reconstructionService.reconstructFromResolvedSource.mockResolvedValue(runtime);
			Object.assign(runtime.agent, { tool: vi.fn(), declaredTools: [] });

			const workflowContext: ExecuteAgentWorkflowContext = {
				workflowId: 'wf-1',
				callingNodeName: 'Message an Agent',
				hasCallerSessionId: false,
				nodes: [],
				runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
			};

			await service.executeInlineForWorkflow(
				inlinePayload,
				'hello',
				'execution-1',
				'thread-1',
				projectId,
				userId,
				'production',
				undefined,
				workflowContext,
			);

			const [source] = reconstructionService.reconstructFromResolvedSource.mock.calls[0];
			// A per-call thread can never be continued — persisting it would only
			// accumulate rows no session UI or cleanup path can reach.
			expect(source.config).not.toHaveProperty('memory');
		});

		it('passes embedded skill bodies through to the runtime, orphans included', async () => {
			const { service, reconstructionService } = makeService();
			const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
			reconstructionService.reconstructFromResolvedSource.mockResolvedValue(runtime);

			const triage = {
				name: 'Triage',
				description: 'Triage incoming requests',
				instructions: 'Categorize the request and route it.',
			};
			// Orphans are forwarded wholesale, like the entity path forwards
			// entity.skills — the runtime only attaches referenced ids.
			const orphan = { ...triage, name: 'Orphan' };

			await service.executeInlineForWorkflow(
				{
					config: {
						...inlinePayload.config,
						skills: [{ type: 'skill', id: 'skill_triage' }],
					},
					skills: { skill_triage: triage, skill_orphan: orphan },
				},
				'hello',
				'execution-1',
				'thread-1',
				projectId,
			);

			expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({ skills: [{ type: 'skill', id: 'skill_triage' }] }),
					skills: { skill_triage: triage, skill_orphan: orphan },
				}),
			);
		});

		it('strips unknown skill-body fields instead of failing the execution', async () => {
			const { service, reconstructionService } = makeService();
			const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);
			reconstructionService.reconstructFromResolvedSource.mockResolvedValue(runtime);

			const triage = {
				name: 'Triage',
				description: 'Triage incoming requests',
				instructions: 'Categorize the request and route it.',
			};

			await service.executeInlineForWorkflow(
				{
					config: {
						...inlinePayload.config,
						skills: [{ type: 'skill', id: 'skill_triage' }],
					},
					// A body persisted by a schema version whose extra field has
					// since been retired must still run, like config keys do.
					skills: { skill_triage: { ...triage, retiredField: 'from an older schema' } },
				},
				'hello',
				'execution-1',
				'thread-1',
				projectId,
			);

			expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
				expect.objectContaining({ skills: { skill_triage: triage } }),
			);
		});

		it('rejects a skill ref without a body, with a pathed error', async () => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{
						config: {
							...inlinePayload.config,
							skills: [{ type: 'skill', id: 'missing' }],
						},
					},
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow(/config\.skills.*has no body/);
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it('rejects an invalid skill body, with a pathed error', async () => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{
						config: {
							...inlinePayload.config,
							skills: [{ type: 'skill', id: 'skill_triage' }],
						},
						skills: {
							skill_triage: { name: 'Triage', description: 'No instructions' },
						},
					},
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow(/skills\.skill_triage/);
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it.each([
			// Memory is injected server-side; the node cannot configure it.
			['memory', { memory: { enabled: true, storage: 'n8n' } }],
			// Approval suspends the run, which workflow executions can't resume.
			[
				'tool approval',
				{
					tools: [{ type: 'workflow', workflow: 'Lookup Orders', requireApproval: true }],
				},
			],
			[
				'MCP approval',
				{
					mcpServers: [
						{
							name: 'github',
							url: 'https://mcp.example.com',
							transport: 'streamableHttp',
							authentication: 'none',
							approval: { mode: 'global' },
						},
					],
				},
			],
		])('rejects configs with saved-agent-only capabilities (%s)', async (_key, extra) => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{
						config: {
							...inlinePayload.config,
							...extra,
						} as unknown as typeof inlinePayload.config,
					},
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow(UserError);
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it('rejects custom (code) tools, whose bodies live only on saved agents', async () => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{
						config: {
							...inlinePayload.config,
							tools: [{ type: 'custom', id: 'my_tool' }],
						} as unknown as typeof inlinePayload.config,
					},
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow(UserError);
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it('rejects an unrunnable draft config (no credential)', async () => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{ config: { ...inlinePayload.config, credential: '' } },
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow(UserError);
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it('tracks a failed inline turn before rethrowing a stream reader error', async () => {
			const { service, reconstructionService, telemetry } = makeService();
			const runtime = makeRuntime();
			runtime.agent.stream.mockResolvedValue({
				stream: makeFailingStream(new Error('reader failed while consuming stream')),
			});
			reconstructionService.reconstructFromResolvedSource.mockResolvedValue(runtime);

			await expect(
				service.executeInlineForWorkflow(
					inlinePayload,
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow('reader failed while consuming stream');

			// Telemetry fires even for failed runs — the rethrow happens after.
			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({ agent_type: 'inline', turn_status: 'failed' }),
			);
		});

		it('surfaces inline compile failures as an OperationalError', async () => {
			const { service, reconstructionService } = makeService();
			reconstructionService.reconstructFromResolvedSource.mockRejectedValue(new Error('boom'));

			const execution = service.executeInlineForWorkflow(
				inlinePayload,
				'hello',
				'execution-1',
				'thread-1',
				projectId,
			);

			await expect(execution).rejects.toThrow(OperationalError);
			await expect(execution).rejects.toThrow('Failed to compile agent: boom');
		});

		it('rejects a malformed $fromAI expression in a node tool before compiling', async () => {
			const { service, reconstructionService } = makeService();

			const execution = service.executeInlineForWorkflow(
				{
					config: {
						...inlinePayload.config,
						tools: [
							{
								type: 'node',
								name: 'HTTP Request',
								node: {
									nodeType: 'n8n-nodes-base.httpRequestTool',
									nodeTypeVersion: 4.4,
									nodeParameters: { url: '={{ $fromAI( }}' },
								},
							},
						],
					} as unknown as typeof inlinePayload.config,
				},
				'hello',
				'execution-1',
				'thread-1',
				projectId,
			);

			await expect(execution).rejects.toThrow(UserError);
			await expect(execution).rejects.toThrow('Invalid $fromAI expression');
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
		});

		it('rejects approval-gated tools, which could never resume in workflow context', async () => {
			const { service, reconstructionService } = makeService();

			await expect(
				service.executeInlineForWorkflow(
					{
						config: {
							...inlinePayload.config,
							tools: [{ type: 'workflow', workflow: 'Lookup', requireApproval: true }],
						} as unknown as typeof inlinePayload.config,
					},
					'hello',
					'execution-1',
					'thread-1',
					projectId,
				),
			).rejects.toThrow('Invalid inline agent configuration');
			expect(reconstructionService.reconstructFromResolvedSource).not.toHaveBeenCalled();
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
