import type { Agent as RuntimeAgent, BuiltAgent, BuiltTool, CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import {
	AGENT_WORKFLOW_TRIGGER_TYPE,
	formatZodErrors,
	RunnableInlineAgentConfigSchema,
	sanitizeAgentJsonConfig,
	sanitizeAgentSkillBodies,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
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
import { Telemetry } from '@/telemetry';

import {
	buildAgentConfigurationTelemetry,
	buildAgentConfigurationTelemetryFromConfig,
} from './agent-telemetry';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRunTracingService } from './agent-run-tracing.service';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { Agent } from './entities/agent.entity';
import { ExecutionRecorder, type MessageRecord } from './execution-recorder';
import { AgentRepository } from './repositories/agent.repository';
import { createInputDataTool } from './tools/input-data-tool';
import { createWorkflowContextTool } from './tools/workflow-context-tool';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { streamAgentChunks } from './utils/agent-stream';
import { validateNodeToolConfigs, validateNodeToolExpressions } from './utils/node-tool-validation';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { describeStructuredOutputError } from './utils/structured-output-error';

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
		private readonly agentExecutionService: AgentExecutionService,
		private readonly telemetry: Telemetry,
		private readonly credentialsService: CredentialsService,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly agentRunTracingService: AgentRunTracingService,
	) {}

	private normalizeWorkflowStreamError(error: unknown, outputSchema?: JSONSchema7): Error {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		if (!outputSchema || normalizedError instanceof OperationalError) return normalizedError;

		const structuredOutputError = describeStructuredOutputError(normalizedError.message);
		if (!structuredOutputError) return normalizedError;

		return new OperationalError(structuredOutputError, { cause: normalizedError });
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
		return { ok: true, agent: reconstructed as BuiltAgent };
	}

	/**
	 * Compile an agent in isolation without writing to the shared runtime cache.
	 * Used by executeForWorkflow so that concurrent Slack / chat executions
	 * are not affected.
	 */
	async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		outputSchema?: JSONSchema7,
		extraTools?: BuiltTool[],
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

	/** Stream one workflow-invoked agent run and collect its outcome. */
	private async streamWorkflowAgent(params: {
		agentInstance: BuiltAgent;
		message: string;
		threadId: string;
		telemetryAgentId: string;
		telemetryUserId?: string;
		outputSchema?: JSONSchema7;
		tracing: {
			projectId: string;
			executionId?: string;
			workflowId?: string;
			nodeId?: string;
		};
	}): Promise<WorkflowAgentRunOutcome> {
		const {
			agentInstance,
			message,
			threadId,
			telemetryAgentId,
			telemetryUserId,
			outputSchema,
			tracing,
		} = params;

		const recorder = new ExecutionRecorder();

		let structuredOutput: unknown = null;
		const toolCalls: ExecuteAgentData['toolCalls'] = [];
		const toolInputs = new Map<string, { toolName: string; input: unknown }>();
		let streamError: Error | undefined;

		try {
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
			});

			const resultStream = await agentInstance.stream(message, {
				// The memory store scopes message reads by `resourceId` (the
				// "per-user scope"; chat integrations pass the chat user id there).
				// Workflow runs have no user, so key the scope by the thread
				// itself: it is stable across executions, which is what lets a
				// caller-supplied session id actually continue the conversation.
				// The previous key — the execution id — changed every run and hid
				// all prior messages of the thread from the model.
				persistence: { resourceId: threadId, threadId },
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId: telemetryAgentId,
					userId: telemetryUserId,
				}),
				...(telemetry ? { telemetry } : {}),
			});

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);

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
		} catch (error) {
			const normalizedError = this.normalizeWorkflowStreamError(error, outputSchema);
			recorder.record({ type: 'error', error: normalizedError });
			recorder.record({ type: 'finish', finishReason: 'error' });
			streamError = normalizedError;
		}

		return {
			recorder,
			messageRecord: recorder.getMessageRecord(),
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
			throw new OperationalError(
				'Agent execution suspended waiting for tool approval. ' +
					'Suspend/resume is not supported in workflow execution context.',
			);
		}

		if (messageRecord.error) {
			if (outputSchema) {
				const structuredOutputError = describeStructuredOutputError(messageRecord.error);
				if (structuredOutputError) {
					throw new OperationalError(structuredOutputError);
				}
			}
			throw new OperationalError(`Agent execution failed: ${messageRecord.error}`);
		}

		if (messageRecord.finishReason === 'error') {
			throw new OperationalError(
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

		const extraTools = this.buildWorkflowExtraTools(workflowContext);
		const compiled = await this.compileIsolated(
			agentData,
			credentialProvider,
			outputSchema,
			extraTools?.length ? extraTools : undefined,
		);
		if (!compiled.ok || !compiled.agent) {
			throw new OperationalError(`Failed to compile agent: ${compiled.error ?? 'unknown error'}`);
		}

		const agentInstance = compiled.agent;
		const run = await this.streamWorkflowAgent({
			agentInstance,
			message,
			threadId,
			telemetryAgentId: agentId,
			telemetryUserId,
			outputSchema,
			tracing: {
				projectId,
				executionId,
				workflowId: workflowContext?.workflowId,
				nodeId: workflowContext?.callingNodeId,
			},
		});

		void this.agentExecutionService
			.recordMessage({
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: message,
				record: run.messageRecord,
				source: AGENT_WORKFLOW_TRIGGER_TYPE,
				telemetry: {
					runType: useDraftVersion ? 'test' : 'production',
					configuration: telemetryConfiguration,
				},
			})
			.catch((error) => {
				this.logger.warn('Failed to record agent execution from workflow', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
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
			outputSchema,
			tracing: {
				projectId,
				executionId,
				workflowId: workflowContext?.workflowId,
				nodeId: workflowContext?.callingNodeId,
			},
		});

		// No `recordMessage` here: inline runs have no agent entity to attach a
		// session to. Emit the turn-finished telemetry directly instead.
		try {
			this.telemetry.trackAgentTurnFinished({
				agent_id: syntheticAgentId,
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
			const details = formatZodErrors(parsed.error)
				.map((issue) => `${issue.path}: ${issue.message}`)
				.join('; ');
			throw new UserError(`Invalid inline agent configuration: ${details}`);
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
