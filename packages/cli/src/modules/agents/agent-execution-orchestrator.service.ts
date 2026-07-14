import type {
	Agent as RuntimeAgent,
	AgentExecutionCounter,
	BuiltAgent,
	BuiltTool,
	CredentialProvider,
	StreamChunk,
} from '@n8n/agents';
import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { AGENT_WORKFLOW_TRIGGER_TYPE, N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import {
	OperationalError,
	type ExecuteAgentData,
	type ExecuteAgentWorkflowContext,
	UserError,
} from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { Agent } from './entities/agent.entity';
import { ExecutionRecorder } from './execution-recorder';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import { createInputDataTool } from './tools/input-data-tool';
import { createWorkflowContextTool } from './tools/workflow-context-tool';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { streamAgentChunks } from './utils/agent-stream';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { describeStructuredOutputError } from './utils/structured-output-error';

export interface AgentMemoryScope {
	threadId: string;
	resourceId: string;
}

export interface ExecuteForChatConfig {
	agentId: string;
	projectId: string;
	message: string;
	/**
	 * The calling n8n user — used to gate node/workflow tools by their access,
	 * and for RBAC / credential resolution and telemetry attribution. Always
	 * present: the in-app test chat only runs behind an authenticated session
	 * (`AgentChatController.chat` always has `req.user`).
	 */
	user: User;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
}

export interface ExecuteForChatPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
	integrationType?: string;
	// No `user` field here: a published chat integration (Slack, Telegram, …)
	// run is triggered by an inbound platform event, not an interactive n8n
	// session — there is no n8n `User` to attach. This path keeps the
	// project-scoped trust boundary that existed before per-user tool
	// gating; the admin who published the agent is the one who approved its
	// tools, and Layer A's node denylist (`EphemeralNodeExecutor`) still
	// applies regardless.
}

export interface ResumeForChatConfig {
	agentId: string;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	/**
	 * The calling n8n user for in-app preview chat resumes — used to gate
	 * node/workflow tools by their access. Absent for published/integration
	 * resumes, which keep today's project-scoped behavior.
	 */
	user?: User;
	/** Defaults to true for external integrations; preview chat passes false. */
	usePublishedVersion?: boolean;
	/**
	 * Required when the suspended turn invoked a platform-injected tool
	 * (e.g. an integration action). Without it, `getRuntime` rebuilds the agent
	 * with only its configured tools, and `runtime.resume` throws because the
	 * persisted tool call references a tool the rebuilt runtime doesn't know.
	 */
	integrationType?: string;
}

export interface ExecuteForTaskPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The scheduled task this run belongs to; stamped on the session for traceability. */
	taskId: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId: string;
	// No `user` field here: this run is fired by `ScheduledTaskManager` on a
	// cron tick — there is no human in the loop at all, let alone an n8n
	// session, so there's nothing to gate tools against. Same project-scoped
	// trust boundary as `ExecuteForChatPublishedConfig`.
}

export interface ExecuteForTaskNowConfig {
	agentId: string;
	projectId: string;
	/**
	 * The calling n8n user — used to gate node/workflow tools by their
	 * access, and for RBAC / credential resolution and recorded on the
	 * session. Always present: manual "Run now" is triggered by an authenticated
	 * `AgentTasksController.runTaskNow` request, threaded down via
	 * `AgentTaskService.runNow(agentId, taskId, user)`.
	 */
	user: User;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The task this manual run belongs to; stamped on the session for traceability. */
	taskId: string;
}

export interface StreamChatResponseConfig {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	userId?: string;
	message: string;
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	telemetry?: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
}

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: 'The agent has reached the maximum number of iterations and has stopped.',
		},
		{ type: 'text-end', id },
	];
}

@Service()
export class AgentExecutionOrchestratorService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly telemetry: Telemetry,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly credentialsService: CredentialsService,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly integrationMessageContextService: IntegrationMessageContextService,
	) {}

	private normalizeWorkflowStreamError(error: unknown, outputSchema?: JSONSchema7): Error {
		const normalizedError = error instanceof Error ? error : new Error(String(error));
		if (!outputSchema || normalizedError instanceof OperationalError) return normalizedError;

		const structuredOutputError = describeStructuredOutputError(normalizedError.message);
		if (!structuredOutputError) return normalizedError;

		return new OperationalError(structuredOutputError, { cause: normalizedError });
	}

	createAgentExecutionCounter({
		agentId,
		userId,
	}: {
		agentId: string;
		userId?: string;
	}): AgentExecutionCounter {
		const attribution = userId ? { user_id: userId } : {};
		return {
			incrementMessageCount: () =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					message_count: 1,
				}),
			incrementTokenCount: (tokenCount) =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					token_count: tokenCount,
				}),
			incrementToolCallCount: () =>
				this.telemetry.trackAgentExecution({
					agent_id: agentId,
					...attribution,
					tool_call_count: 1,
				}),
		};
	}

	/**
	 * Return user-visible conversation history for a persisted chat thread.
	 *
	 * Execution records are the source of truth for the UI transcript. SDK
	 * memory is runtime context for the agent: it can be disabled, windowed, or
	 * shaped for model input rather than for user-facing history.
	 */
	async getConversationHistory(params: {
		threadId: string;
		projectId: string;
		agentId: string;
	}): Promise<AgentPersistedMessageDto[] | null> {
		const { threadId, projectId, agentId } = params;
		const detail = await this.agentExecutionService.getThreadDetail(threadId, projectId, agentId);
		if (!detail) return null;
		return executionsToMessagesDto(detail.executions);
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			runId,
			toolCallId,
			resumeData,
			integrationType,
			user,
			usePublishedVersion = true,
		} = config;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus.status === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus.status === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const memoryScope = checkpointStatus.checkpoint?.persistence;
		if (!memoryScope) {
			throw new UserError(`Checkpoint ${runId} has no memory data and cannot be resumed`);
		}

		const threadId = memoryScope.threadId;

		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			usePublishedVersion,
			integrationType,
			// `usePublishedVersion` defaults to true and is what platform
			// integrations (Slack/Telegram HITL resume) use — those have no
			// interactive n8n user, so `user` is force-undefined to keep the
			// existing project-scoped runtime. Only the in-app draft/test-chat
			// resume passes `usePublishedVersion: false` (see
			// `AgentChatController.chatResume`), and only then does the caller's
			// `user` actually reach the cache/reconstruction layer.
			user: usePublishedVersion ? undefined : user,
		});

		const { agent: agentInstance, toolRegistry } = runtime;
		const recorder = new ExecutionRecorder(toolRegistry);
		const runType: AgentRunTelemetryType = usePublishedVersion ? 'production' : 'test';

		try {
			const resultStream = await agentInstance.resume('stream', resumeData, {
				runId,
				toolCallId,
				executionCounter: this.createAgentExecutionCounter({ agentId, userId: user?.id }),
			});

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);
				yield value;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record resumed executions — even if they suspend again (chained HITL)
			// or fail while streaming. Don't repeat the original user message — the
			// pre-suspension execution already has it.
			const messageRecord = recorder.getMessageRecord();
			void this.agentExecutionService
				.recordMessage({
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage: null,
					record: messageRecord,
					hitlStatus: recorder.suspended ? 'suspended' : 'resumed',
					telemetry: {
						runType,
						configuration: runtime.telemetryConfiguration,
					},
				})
				.catch((error) => {
					this.logger.warn('Failed to record resumed agent execution', {
						agentId,
						threadId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, user, memory } = config;

		// `user` is always set (see ExecuteForChatConfig) — this builds/reuses a
		// runtime scoped to this specific user's tool access.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
		});

		await this.integrationMessageContextService.setLatest(memory.threadId, memory.resourceId, {
			integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
			platform: N8N_CHAT_INTEGRATION_TYPE,
			target: { type: 'dm', userId: user.id, threadId: memory.threadId },
			interactingUserId: user.id,
			updatedAt: new Date().toISOString(),
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			userId: user.id,
			message,
			memory,
			projectId: runtime.projectId,
			telemetry: {
				runType: 'test',
				configuration: runtime.telemetryConfiguration,
			},
		});
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, integrationType } = config;

		// No `user` (see ExecuteForChatPublishedConfig): this is the shared,
		// project-scoped runtime — every caller of this published agent through
		// this integration reuses the same cache entry regardless of who
		// triggered the platform event.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType,
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: integrationType,
			telemetry: {
				runType: 'production',
				configuration: runtime.telemetryConfiguration,
			},
		});
	}

	/**
	 * Execute a published agent for a scheduled task, stamping `source='task'`
	 * and the originating `taskId` on the recorded session for traceability.
	 */
	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, taskId, taskVersionId } = config;

		// No `user` (see ExecuteForTaskPublishedConfig): cron-fired, no human to
		// attach — same shared, project-scoped runtime for every tick.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType: 'task',
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId,
			taskVersionId,
			telemetry: {
				runType: 'production',
				configuration: runtime.telemetryConfiguration,
			},
		});
	}

	/**
	 * Execute a task on demand against the current (draft) config as the
	 * requesting user.
	 */
	async *executeForTaskNow(config: ExecuteForTaskNowConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, user, message, memory, taskId } = config;

		// `user` is always set (see ExecuteForTaskNowConfig) — manual "Run now"
		// runs get a runtime scoped to the requesting user's tool access, same
		// as the in-app test chat.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			user,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			userId: user.id,
			message,
			memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId,
			telemetry: {
				runType: 'test',
				configuration: runtime.telemetryConfiguration,
			},
		});
	}

	/**
	 * Stream an agent response, record it, and yield each chunk.
	 */
	async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			agentInstance,
			toolRegistry,
			agentId,
			userId,
			message,
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
			telemetry,
		} = config;
		const { threadId, resourceId } = memory;

		const recorder = new ExecutionRecorder(toolRegistry);

		try {
			const resultStream = await agentInstance.stream(message, {
				persistence: { threadId, resourceId },
				executionCounter: this.createAgentExecutionCounter({ agentId, userId }),
			});

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);
				if (value.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId,
						toolCallId: value.toolCallId,
						toolName: value.toolName,
					});
				}
				if (value.type === 'finish' && value.finishReason === 'max-iterations') {
					for (const chunk of getMaxIterationsChunks()) {
						recorder.record(chunk);
						yield chunk;
					}
				}
				yield value;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record — even if suspended or failed, the pre-suspension/error
			// response text and tool calls are valuable.
			const messageRecord = recorder.getMessageRecord();
			void this.agentExecutionService
				.recordMessage({
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage: message,
					record: messageRecord,
					hitlStatus: recorder.suspended ? 'suspended' : undefined,
					source,
					taskId,
					taskVersionId,
					telemetry,
				})
				.catch((error) => {
					this.logger.warn('Failed to record agent execution', {
						agentId,
						threadId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}
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
			// Apply a per-call structured-output schema before casting to runtime.
			if (outputSchema) {
				reconstructed.structuredOutput(outputSchema);
			}
			// Inject per-call extra tools (e.g. the workflow-data tools for
			// MessageAnAgent invocations). A name already declared on the agent would
			// otherwise be silently dropped (losing workflow data access) or trigger a
			// "Static tool name collision" error from the SDK at stream time — surface
			// it instead so the agent author can rename their tool.
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
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : 'Unknown compilation error',
			};
		}
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

		const extraTools: BuiltTool[] = [];
		if (workflowContext) {
			extraTools.push(createInputDataTool(workflowContext));
			if (workflowContext.exposeWorkflowData) {
				extraTools.push(createWorkflowContextTool(workflowContext));
			}
		}
		const compiled = await this.compileIsolated(
			agentData,
			credentialProvider,
			outputSchema,
			extraTools.length ? extraTools : undefined,
		);
		if (!compiled.ok || !compiled.agent) {
			throw new OperationalError(`Failed to compile agent: ${compiled.error ?? 'unknown error'}`);
		}

		const agentInstance = compiled.agent;
		const recorder = new ExecutionRecorder();

		let structuredOutput: unknown = null;
		const toolCalls: ExecuteAgentData['toolCalls'] = [];
		const toolInputs = new Map<string, { toolName: string; input: unknown }>();
		let streamError: Error | undefined;

		try {
			const resultStream = await agentInstance.stream(message, {
				persistence: { resourceId: executionId, threadId },
				executionCounter: this.createAgentExecutionCounter({ agentId, userId: telemetryUserId }),
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

		const messageRecord = recorder.getMessageRecord();

		void this.agentExecutionService
			.recordMessage({
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: message,
				record: messageRecord,
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
			session: {
				agentId,
				projectId,
				sessionId: threadId,
			},
		};
	}
}
