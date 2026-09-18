import type { Agent as RuntimeAgent, BuiltAgent, BuiltTool, CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import {
	AGENT_WORKFLOW_TRIGGER_TYPE,
	formatAgentConfigZodError,
	RunnableInlineAgentConfigSchema,
	sanitizeAgentJsonConfig,
	sanitizeAgentSkillBodies,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { context } from '@opentelemetry/api';
import type { JSONSchema7 } from 'json-schema';
import {
	OperationalError,
	type ExecuteAgentData,
	type ExecuteAgentWorkflowContext,
	type InlineAgentPayload,
	UserError,
} from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import type { AgentRunTelemetryType } from '@/interfaces';
import { ExecutionLevelTracer } from '@/modules/otel/execution-level-tracer';
import { Telemetry } from '@/telemetry';

import type { StartExecutionParams } from './agent-execution.service';
import { AgentRunTracingService } from './agent-run-tracing.service';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import {
	encodeAgentSandboxHostMetadata,
	type AgentSandboxPrincipalHash,
} from './agent-sandbox-principal';
import {
	buildAgentConfigurationTelemetry,
	buildAgentConfigurationTelemetryFromConfig,
} from './agent-telemetry';
import { AgentTurnExecutionService } from './agent-turn-execution.service';
import type { Agent } from './entities/agent.entity';
import type { ExecutionRecorder, MessageRecord } from './execution-recorder';
import { encodeIntegrationMessageContext } from './integrations/integration-message-context';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { modelStreamStallOptions } from './model-stream-stall-options';
import { AgentRepository } from './repositories/agent.repository';
import { createInputDataTool } from './tools/input-data-tool';
import { createWorkflowContextTool } from './tools/workflow-context-tool';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { streamAgentChunks } from './utils/agent-stream';
import { validateNodeToolConfigs, validateNodeToolExpressions } from './utils/node-tool-validation';
import { describeStructuredOutputError } from './utils/structured-output-error';
import {
	WorkflowAgentStreamAdapter,
	type WorkflowAgentStreamObserver,
} from './workflow-agent-stream';

interface WorkflowSandboxScope {
	principalHash: AgentSandboxPrincipalHash;
}

interface WorkflowAgentStreamParams {
	agentInstance: BuiltAgent;
	message: string;
	threadId: string;
	telemetryAgentId: string;
	telemetryUserId?: string;
	runType: AgentRunTelemetryType;
	outputSchema?: JSONSchema7;
	tracing: {
		projectId: string;
		executionId?: string;
		workflowId?: string;
		nodeId?: string;
		nodeName?: string;
	};
	recordingParams?: StartExecutionParams;
	streamObserver?: WorkflowAgentStreamObserver;
	sandboxScope?: { projectId: string; principalHash: AgentSandboxPrincipalHash };
}

interface WorkflowAgentStreamConsumption {
	structuredOutput: unknown;
	toolCalls: ExecuteAgentData['toolCalls'];
	streamError: Error | undefined;
	executionError: unknown;
	executionStarted: boolean;
}

function getFinalWorkflowResponse(messageRecord: MessageRecord): string {
	let lastToolCallIndex = -1;
	for (let index = messageRecord.timeline.length - 1; index >= 0; index--) {
		if (messageRecord.timeline[index]?.type === 'tool-call') {
			lastToolCallIndex = index;
			break;
		}
	}
	if (lastToolCallIndex === -1) return messageRecord.assistantResponse;

	return messageRecord.timeline
		.slice(lastToolCallIndex + 1)
		.filter((event) => event.type === 'text')
		.map((event) => event.content)
		.join('');
}

function createWorkflowAgentExecutionError(message: string, cause?: Error): OperationalError {
	return new OperationalError(message, {
		description: message,
		...(cause ? { cause } : {}),
	});
}

/**
 * Executes agents invoked from inside a workflow execution (the AI Agent node
 * or a "Message an Agent" tool call): non-streaming runs against isolated
 * compiles that never touch the shared runtime cache. The interactive chat /
 * scheduled-task paths live in `AgentExecutionOrchestratorService`.
 */
@Service()
export class AgentWorkflowExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly turnExecutionService: AgentTurnExecutionService,
		private readonly telemetry: Telemetry,
		private readonly credentialsService: CredentialsService,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly agentRunTracingService: AgentRunTracingService,
		private readonly executionLevelTracer: ExecutionLevelTracer,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
		private readonly aiConfig: AiConfig,
		private readonly integrationMessageContextService: IntegrationMessageContextService,
	) {}

	private normalizeWorkflowStreamError(error: unknown, outputSchema?: JSONSchema7): Error {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		if (!outputSchema || normalizedError instanceof OperationalError) {
			if ('description' in normalizedError && typeof normalizedError.description === 'string') {
				return normalizedError;
			}
			return createWorkflowAgentExecutionError(normalizedError.message, normalizedError);
		}

		const structuredOutputError = describeStructuredOutputError(normalizedError.message);
		if (!structuredOutputError) {
			return createWorkflowAgentExecutionError(normalizedError.message, normalizedError);
		}

		return createWorkflowAgentExecutionError(structuredOutputError, normalizedError);
	}

	/**
	 * Apply per-call add-ons to a reconstructed runtime: a structured-output
	 * schema and extra tools (e.g. the workflow-data tools for MessageAnAgent
	 * invocations). An extra-tool name already declared on the agent would
	 * otherwise be silently dropped (losing workflow data access) or trigger a
	 * "Static tool name collision" error from the SDK at stream time — surface
	 * it instead so the agent author can rename their tool.
	 */
	private applyPerCallAgentExtras(
		reconstructed: RuntimeAgent,
		outputSchema?: JSONSchema7,
		extraTools?: BuiltTool[],
	): { ok: boolean; agent?: BuiltAgent; error?: string } {
		if (outputSchema) {
			reconstructed.structuredOutput(outputSchema);
		}
		if (extraTools?.length) {
			const declared = new Set(reconstructed.declaredTools.map((t) => t.name));
			const collisions = extraTools.filter((t) => declared.has(t.name)).map((t) => t.name);
			if (collisions.length) {
				const names = collisions.map((n) => `"${n}"`).join(', ');
				const plural = collisions.length > 1;
				return {
					ok: false,
					error:
						`Agent declares ${plural ? 'tools' : 'a tool'} named ${names}, ` +
						`which ${plural ? 'are' : 'is'} reserved by n8n for workflow data access. ` +
						`Rename the agent ${plural ? 'tools' : 'tool'} to avoid the collision.`,
				};
			}
			reconstructed.tool(extraTools);
		}
		return { ok: true, agent: reconstructed };
	}

	/**
	 * Compile an agent in isolation without writing to the shared runtime cache.
	 * Used by executeForWorkflow so that concurrent Slack / chat executions
	 * are not affected.
	 */
	async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		runType: AgentRunTelemetryType,
		outputSchema?: JSONSchema7,
		extraTools?: BuiltTool[],
		sandboxPrincipalHash?: AgentSandboxPrincipalHash,
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		if (!agentEntity.schema) {
			return { ok: false, error: 'Agent has no JSON config. Create a config first.' };
		}

		try {
			// No `user`: this path runs an agent invoked from inside a workflow
			// execution (AI Agent node, or a "Message an Agent" tool call from
			// another workflow) — there is no interactive n8n user, only a bare
			// telemetry id (see `executeForWorkflow`'s `telemetryUserId`), and for
			// webhook/trigger-fired executions even that can be absent. This
			// runtime also isn't cached (see the docstring above), so there's no
			// cache-key concern here either — just no per-user tool filtering.
			const { agent: reconstructed } =
				await this.agentRuntimeReconstructionService.reconstructFromAgentEntity(
					agentEntity,
					credentialProvider,
					runType,
					undefined,
					undefined,
					undefined,
					'manual',
					sandboxPrincipalHash,
					// A workflow execution cannot resume a suspended run — it throws
					// instead (see `recorder.suspended` below).
					{ supportsHitl: false },
				);
			return this.applyPerCallAgentExtras(reconstructed, outputSchema, extraTools);
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : 'Unknown compilation error',
			};
		}
	}

	/**
	 * Compile an inline (node-embedded) agent definition in isolation. Mirrors
	 * `compileIsolated`, but reconstructs from a raw config instead of an
	 * entity: skill bodies come from the node parameter rather than an entity,
	 * inline agents have no custom-tool bodies, and they run under the 'inline'
	 * runtime profile (no checkpoints, knowledge, integrations, or sub-agent
	 * delegation).
	 */
	private async compileIsolatedFromSource(
		config: AgentJsonConfig,
		skills: Record<string, AgentSkill>,
		syntheticAgentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		runType: AgentRunTelemetryType,
		outputSchema?: JSONSchema7,
		extraTools?: BuiltTool[],
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		try {
			const { agent: reconstructed } =
				await this.agentRuntimeReconstructionService.reconstructFromResolvedSource({
					config,
					memoryOwnerAgentId: syntheticAgentId,
					projectId,
					credentialProvider,
					toolDescriptors: {},
					toolCodeByName: {},
					skills,
					runtimeProfile: 'inline',
					runType,
				});
			return this.applyPerCallAgentExtras(reconstructed, outputSchema, extraTools);
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : 'Unknown compilation error',
			};
		}
	}

	/** Per-call workflow-data tools exposed to a workflow-invoked agent. */
	private buildWorkflowExtraTools(
		workflowContext?: ExecuteAgentWorkflowContext,
	): BuiltTool[] | undefined {
		if (!workflowContext) return undefined;

		const extraTools: BuiltTool[] = [createInputDataTool(workflowContext)];
		if (workflowContext.exposeWorkflowData) {
			extraTools.push(createWorkflowContextTool(workflowContext));
		}
		return extraTools;
	}

	private async consumeWorkflowAgentStream(
		params: WorkflowAgentStreamParams,
		recorder: ExecutionRecorder,
		streamAdapter: WorkflowAgentStreamAdapter,
	): Promise<WorkflowAgentStreamConsumption> {
		const {
			agentInstance,
			message,
			threadId,
			telemetryAgentId,
			telemetryUserId,
			runType,
			outputSchema,
			tracing,
			recordingParams,
			sandboxScope,
		} = params;
		let structuredOutput: unknown = null;
		const toolCalls: ExecuteAgentData['toolCalls'] = [];
		const toolInputs = new Map<string, { toolName: string; input: unknown }>();
		let streamError: Error | undefined;
		let executionError: unknown;
		let executionStarted = false;

		try {
			// Nest the agent's root span under the calling node's OTel span (rather
			// than a disconnected root trace) by running inside its active context.
			// Falls back to running unwrapped when no such span is tracked (e.g. otel
			// disabled) — `context.with` needs an actual parent context to nest under.
			const parentCtx = tracing.executionId
				? this.executionLevelTracer.getActiveContext(tracing.executionId, tracing.nodeName)
				: undefined;

			const run = async (): Promise<void> => {
				// No model_id here: BuiltAgent (unlike the cached-runtime RuntimeAgent
				// used by the chat/task paths) doesn't expose a snapshot. The AI SDK's
				// own gen_ai.request.model attribute on its model spans still carries
				// this regardless.
				const telemetry = await this.agentRunTracingService.build({
					agentId: telemetryAgentId,
					projectId: tracing.projectId,
					threadId,
					userId: telemetryUserId,
					source: 'workflow',
					executionId: tracing.executionId,
					workflowId: tracing.workflowId,
					nodeId: tracing.nodeId,
					hasParentContext: parentCtx !== undefined,
				});

				// Only stored agents have integration tools.
				const messageContext = recordingParams
					? await this.integrationMessageContextService.getLatest(threadId)
					: null;
				const options = {
					// The memory store scopes message reads by `resourceId` (the
					// "per-user scope"; chat integrations pass the chat user id there).
					// Workflow runs have no user, so key the scope by the thread
					// itself: it is stable across executions, which is what lets a
					// caller-supplied session id actually continue the conversation.
					// The previous key — the execution id — changed every run and hid
					// all prior messages of the thread from the model.
					persistence: {
						resourceId: threadId,
						threadId,
						hostMetadata: {
							...(sandboxScope ? encodeAgentSandboxHostMetadata(sandboxScope) : {}),
							...encodeIntegrationMessageContext(messageContext),
						},
					},
					executionCounter: createAgentExecutionCounter(this.telemetry, {
						agentId: telemetryAgentId,
						userId: telemetryUserId,
						runType,
					}),
					...modelStreamStallOptions(this.aiConfig),
					...(telemetry ? { telemetry } : {}),
				};
				executionStarted = true;
				const resultStream = await agentInstance.stream(message, options);

				for await (const value of streamAgentChunks(resultStream.stream)) {
					if (value.type === 'error') {
						executionError = value.error;
						if (outputSchema)
							streamError = this.normalizeWorkflowStreamError(value.error, outputSchema);
					}
					recorder.record(
						value.type === 'error' && streamError ? { ...value, error: streamError } : value,
					);
					await streamAdapter.observe(value);

					if (value.type === 'tool-call') {
						toolInputs.set(value.toolCallId, { toolName: value.toolName, input: value.input });
					} else if (value.type === 'tool-result') {
						const pending = toolInputs.get(value.toolCallId);
						toolCalls.push({
							toolName: value.toolName,
							input: pending?.input ?? null,
							result: value.output,
						});
						toolInputs.delete(value.toolCallId);
					} else if (value.type === 'finish' && value.structuredOutput !== undefined) {
						structuredOutput = value.structuredOutput;
					}
				}
			};

			if (parentCtx) {
				await context.with(parentCtx, run);
			} else {
				await run();
			}
		} catch (error) {
			executionError = error;
			const normalizedError = this.normalizeWorkflowStreamError(error, outputSchema);
			recorder.record({ type: 'error', error: normalizedError });
			recorder.record({ type: 'finish', finishReason: 'error' });
			streamError = normalizedError;
			streamAdapter.fail();
		}

		return { structuredOutput, toolCalls, streamError, executionError, executionStarted };
	}

	/** Stream one workflow-invoked agent run and collect its outcome. */
	private async streamWorkflowAgent(
		params: WorkflowAgentStreamParams,
	): Promise<WorkflowAgentRunOutcome> {
		const { recordingParams } = params;
		const streamAdapter = new WorkflowAgentStreamAdapter(params.streamObserver);
		let agentExecutionId: string | undefined;
		const recorder = this.turnExecutionService.createRecorder(
			undefined,
			() => agentExecutionId,
			recordingParams,
		);
		if (recordingParams) {
			agentExecutionId = await this.turnExecutionService.startExecution(
				recordingParams,
				recorder.startedAt,
			);
		}

		const { structuredOutput, toolCalls, streamError, executionError, executionStarted } =
			await this.consumeWorkflowAgentStream(params, recorder, streamAdapter);

		const messageRecord = recorder.getMessageRecord();
		if (recordingParams && agentExecutionId) {
			await this.turnExecutionService.finalizeExecution({
				executionId: agentExecutionId,
				executionStarted,
				executionError,
				params: { ...recordingParams, record: messageRecord },
			});
		}

		return {
			recorder,
			messageRecord: {
				...messageRecord,
				assistantResponse: getFinalWorkflowResponse(messageRecord),
			},
			structuredOutput,
			toolCalls,
			streamError,
		};
	}

	/**
	 * Turn a collected workflow-invoked run into the caller-facing result,
	 * translating failure states into thrown errors.
	 */
	private buildWorkflowResult(params: {
		run: WorkflowAgentRunOutcome;
		session: ExecuteAgentData['session'];
		outputSchema?: JSONSchema7;
	}): ExecuteAgentData {
		const { run, session, outputSchema } = params;
		const { recorder, messageRecord, structuredOutput, toolCalls, streamError } = run;

		if (streamError !== undefined) {
			throw streamError;
		}

		if (recorder.suspended) {
			throw createWorkflowAgentExecutionError(
				'Agent execution suspended waiting for tool approval. ' +
					'Suspend/resume is not supported in workflow execution context.',
			);
		}

		if (messageRecord.error) {
			if (outputSchema) {
				const structuredOutputError = describeStructuredOutputError(messageRecord.error);
				if (structuredOutputError) {
					throw createWorkflowAgentExecutionError(structuredOutputError);
				}
			}
			throw createWorkflowAgentExecutionError(`Agent execution failed: ${messageRecord.error}`);
		}

		if (messageRecord.finishReason === 'error') {
			throw createWorkflowAgentExecutionError(
				outputSchema
					? 'Agent execution finished with an error while producing structured output. ' +
							"The agent's model or provider may not support JSON Schema structured output."
					: 'Agent execution finished with an error.',
			);
		}

		return {
			response: messageRecord.assistantResponse,
			structuredOutput: structuredOutput ?? null,
			usage: messageRecord.usage
				? {
						promptTokens: messageRecord.usage.promptTokens,
						completionTokens: messageRecord.usage.completionTokens,
						totalTokens: messageRecord.usage.totalTokens,
					}
				: null,
			toolCalls,
			finishReason: messageRecord.finishReason,
			session,
		};
	}

	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		projectId: string,
		telemetryUserId?: string,
		useDraftVersion?: boolean,
		outputSchema?: JSONSchema7,
		workflowContext?: ExecuteAgentWorkflowContext,
		sandboxScope?: WorkflowSandboxScope,
		streamObserver?: WorkflowAgentStreamObserver,
	): Promise<ExecuteAgentData> {
		return await this.executeForWorkflowInternal(
			agentId,
			message,
			executionId,
			threadId,
			projectId,
			telemetryUserId,
			useDraftVersion,
			outputSchema,
			workflowContext,
			sandboxScope,
			streamObserver,
		);
	}

	private async executeForWorkflowInternal(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		projectId: string,
		telemetryUserId?: string,
		useDraftVersion?: boolean,
		outputSchema?: JSONSchema7,
		workflowContext?: ExecuteAgentWorkflowContext,
		sandboxScope?: WorkflowSandboxScope,
		streamObserver?: WorkflowAgentStreamObserver,
	): Promise<ExecuteAgentData> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			throw new OperationalError('Agent not found or not accessible.');
		}

		const credentialProvider = createAgentCredentialProvider(this.credentialsService, projectId);

		let agentData: Agent = agentEntity;

		if (!useDraftVersion) {
			agentData = getPublishedAgentSnapshot(agentEntity);
		}
		const telemetryConfiguration = buildAgentConfigurationTelemetry(agentData);
		const runType: AgentRunTelemetryType = useDraftVersion ? 'test' : 'production';

		const recordingParams: StartExecutionParams = {
			threadId,
			agentId,
			agentName: agentData.schema?.name ?? agentData.name,
			projectId,
			userMessage: message,
			source: AGENT_WORKFLOW_TRIGGER_TYPE,
			telemetry: { userId: telemetryUserId, runType, configuration: telemetryConfiguration },
		};

		const extraTools = this.buildWorkflowExtraTools(workflowContext);
		const compiled = await this.compileIsolated(
			agentData,
			credentialProvider,
			runType,
			outputSchema,
			extraTools?.length ? extraTools : undefined,
			sandboxScope?.principalHash,
		);
		if (!compiled.ok || !compiled.agent) {
			const error = new OperationalError(
				`Failed to compile agent: ${compiled.error ?? 'unknown error'}`,
			);
			await this.turnExecutionService.recordFailedStart(recordingParams, error);
			throw error;
		}

		const agentInstance = compiled.agent;
		const run = await this.streamWorkflowAgent({
			agentInstance,
			message,
			threadId,
			telemetryAgentId: agentId,
			telemetryUserId,
			runType,
			outputSchema,
			tracing: {
				projectId,
				executionId,
				workflowId: workflowContext?.workflowId,
				nodeId: workflowContext?.callingNodeId,
				nodeName: workflowContext?.callingNodeName,
			},
			recordingParams: { ...recordingParams, agentName: agentInstance.name },
			streamObserver,
			...(sandboxScope
				? {
						sandboxScope: {
							projectId,
							principalHash: sandboxScope.principalHash,
						},
					}
				: {}),
		});

		return this.buildWorkflowResult({
			run,
			// sessionId here is still the scoped thread key — executeAgent remaps it
			// to the caller-facing id; this method never sees the unscoped one.
			session: { agentId, projectId, sessionId: threadId, threadId },
			outputSchema,
		});
	}

	/**
	 * Execute an inline agent embedded in a workflow node's parameters. There is
	 * no entity, so published/draft gating does not apply — the embedded config
	 * is always what runs. When the caller supplies a session id, conversation-
	 * thread memory persists (the thread tables carry no agent FK) so that id
	 * continues the conversation across executions; but no session is *recorded*
	 * for the sessions UI (`agent_execution_threads.agentId` is an FK to
	 * `agents`), so the result carries `session: null`.
	 */
	async executeInlineForWorkflow(
		inlineAgent: InlineAgentPayload,
		message: string,
		executionId: string,
		threadId: string,
		projectId: string,
		telemetryUserId?: string,
		runType: AgentRunTelemetryType = 'production',
		outputSchema?: JSONSchema7,
		workflowContext?: ExecuteAgentWorkflowContext,
		streamObserver?: WorkflowAgentStreamObserver,
	): Promise<ExecuteAgentData> {
		const { config, skills } = await this.validateInlineAgentConfig(inlineAgent);

		// Session memory: when the caller supplied a session id, inline agents run
		// with plain conversation-thread memory so that id continues the same
		// conversation across executions. Injected server-side, never part of the node's
		// config: long-term memory (observational/episodic) stays off because it
		// accumulates under the agent id, and inline agents only have a synthetic,
		// node-rename-sensitive one. Without a session id the thread is per-call
		// and can never be continued, so nothing is persisted — inline runs record
		// no session, which would otherwise grow unreachable thread/message rows.
		const persistMemory = workflowContext?.hasCallerSessionId === true;
		const runtimeConfig: AgentJsonConfig = persistMemory
			? {
					...config,
					memory: {
						enabled: true,
						storage: 'n8n',
						observationalMemory: { enabled: false },
						episodicMemory: { enabled: false },
					},
				}
			: config;

		const credentialProvider = createAgentCredentialProvider(this.credentialsService, projectId);

		// Re-validate any `__aiGatewayManaged` marker on node-tool credentials
		// against live gateway eligibility. The marker is server-assigned, but the
		// inline config comes straight from a workflow node parameter and never
		// passes the agent-config write path that reconciles persisted agents — so
		// re-earn it here, or a workflow author could forge one for a node/action
		// n8n Connect doesn't cover and mint a managed credential regardless.
		const accessibleCredentials = await credentialProvider.list();
		await this.nodeToolAiGatewayService.assignManagedCredentials(
			runtimeConfig.tools,
			new Set(accessibleCredentials.map((credential) => credential.type)),
		);

		// For telemetry/logging and memory-owner keying — never persisted, and
		// stable enough to aggregate runs of the same node across executions.
		const syntheticAgentId = `inline:${workflowContext?.workflowId ?? 'unknown'}:${
			workflowContext?.callingNodeName ?? 'unknown'
		}`;

		const extraTools = this.buildWorkflowExtraTools(workflowContext);
		const compiled = await this.compileIsolatedFromSource(
			runtimeConfig,
			skills,
			syntheticAgentId,
			projectId,
			credentialProvider,
			runType,
			outputSchema,
			extraTools?.length ? extraTools : undefined,
		);
		if (!compiled.ok || !compiled.agent) {
			throw new OperationalError(`Failed to compile agent: ${compiled.error ?? 'unknown error'}`);
		}

		const run = await this.streamWorkflowAgent({
			agentInstance: compiled.agent,
			message,
			threadId,
			telemetryAgentId: syntheticAgentId,
			telemetryUserId,
			runType,
			outputSchema,
			tracing: {
				projectId,
				executionId,
				workflowId: workflowContext?.workflowId,
				nodeId: workflowContext?.callingNodeId,
				nodeName: workflowContext?.callingNodeName,
			},
			streamObserver,
		});

		// No `recordMessage` here: inline runs have no agent entity to attach a
		// session to. Emit the turn-finished telemetry directly instead.
		try {
			this.telemetry.trackAgentTurnFinished({
				agent_id: syntheticAgentId,
				user_id: telemetryUserId,
				thread_id: threadId,
				run_type: runType,
				agent_type: 'inline',
				turn_status:
					run.messageRecord.error !== null || run.messageRecord.finishReason === 'error'
						? 'failed'
						: 'succeeded',
				configuration: buildAgentConfigurationTelemetryFromConfig(runtimeConfig),
				latency_ms: run.messageRecord.duration,
				cost: run.messageRecord.totalCost ?? 0,
				token_count: run.messageRecord.usage?.totalTokens ?? 0,
				tool_call_count: run.messageRecord.timeline.filter((t) => t.type === 'tool-call').length,
			});
		} catch (error) {
			this.logger.warn('Failed to track inline agent execution telemetry', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return this.buildWorkflowResult({ run, session: null, outputSchema });
	}

	/**
	 * Validate the node-supplied inline definition into a runnable config plus
	 * its skill bodies. The strict schema rejects capabilities inline agents
	 * don't support (memory, sub-agents, custom tools, the options block), so
	 * saved-agent-only features can't sneak in through raw JSON. Skills mirror
	 * the entity shape: refs in `config.skills`, bodies in the sibling `skills`
	 * record — a ref without a body fails here with a pathed error. See
	 * `InlineAgentJsonConfigSchema` for the authoritative allowlist.
	 */
	private async validateInlineAgentConfig(
		payload: InlineAgentPayload,
	): Promise<{ config: AgentJsonConfig; skills: Record<string, AgentSkill> }> {
		const parsed = RunnableInlineAgentConfigSchema.safeParse({
			config: sanitizeAgentJsonConfig(payload.config),
			// Sanitized like the config, so persisted bodies degrade gracefully
			// as the skill schema evolves instead of hard-failing at execution.
			...(payload.skills !== undefined ? { skills: sanitizeAgentSkillBodies(payload.skills) } : {}),
		});
		if (!parsed.success) {
			throw new UserError(
				`Invalid inline agent configuration: ${formatAgentConfigZodError(parsed.error)}`,
			);
		}
		const config = parsed.data.config;

		try {
			validateNodeToolExpressions(config.tools);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new UserError(`Invalid $fromAI expression in node tool config: ${message}`);
		}

		const nodeError = await validateNodeToolConfigs(config.tools);
		if (nodeError) {
			throw new UserError(`Invalid inline agent configuration: ${nodeError}`);
		}

		return { config, skills: parsed.data.skills ?? {} };
	}
}

interface WorkflowAgentRunOutcome {
	recorder: ExecutionRecorder;
	messageRecord: MessageRecord;
	structuredOutput: unknown;
	toolCalls: ExecuteAgentData['toolCalls'];
	streamError?: Error;
}
