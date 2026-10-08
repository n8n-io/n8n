import type {
	AgentExecutionCounter,
	BuiltTelemetry,
	CredentialProvider,
	MemoryTaskUsageReport,
	ModelConfig,
	ScopedMemoryTaskEvent,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	Telemetry,
	Agent as RuntimeAgent,
} from '@n8n/agents';
import { createObservationLogObserveFn, createObservationLogReflectFn } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	REPORT_REQUIRED_ARTIFACT_TOOL_NAME,
	reportRequiredArtifactInputSchema,
	resolveAIAPromptCaching,
	resolveAIAReasoning,
	tokenUsageToBuilderUsageItems,
	type BuilderRequiredArtifact,
	type InstanceAiCredentialService,
	type InstanceAiToolRegistry,
	type ReportRequiredArtifactInput,
} from '@n8n/instance-ai';

import { NotFoundError } from '@n8n/errors';
import { NodeCatalogService } from '@/node-catalog';

import { InstanceAiCreditService } from '../../instance-ai/instance-ai-credit.service';
import type { StartExecutionParams } from '../agent-execution.service';
import { AgentTurnExecutionService } from '../agent-turn-execution.service';
import { AgentsService } from '../agents.service';
import type { ExecutionRecorder } from '../execution-recorder';
import {
	AgentExecutionRepository,
	type AgentExecutionLinks,
} from '../repositories/agent-execution.repository';
import {
	EXECUTION_METADATA_KEY,
	type AgentExecutionAdmission,
} from '../types/agent-queued-message';
import { bindExecutionInput } from '../utils/execution-input';
import { modelStreamStallOptions } from '../model-stream-stall-options';
import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { getModelRecommendationsSection } from './agents-builder-model-recommendations';
import { buildBuilderPrompt, buildBuilderSessionContext } from './agents-builder-prompts';
import { AgentsBuilderToolsService, type BuilderTools } from './agents-builder-tools.service';
import { BUILT_AGENT_ID_METADATA_KEY } from './builder-thread-metadata';
import { BuilderCheckpointUnavailableError } from './errors';
import {
	BUILDER_PLANNER_TODOS_DESCRIPTION,
	BUILDER_PLANNER_TODOS_SYSTEM_INSTRUCTION,
} from './prompts/planner-todos.prompt';
import { getBuilderRuntimeSkills } from './skills';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import { streamAgentChunks } from '../utils/agent-stream';

/** Execution source of a recorded builder turn. */
export const BUILDER_EXECUTION_SOURCE = 'builder';

/** Runtime name of the builder agent. A recorded builder session shows it as its agent name. */
export const BUILDER_AGENT_NAME = 'agent-builder';

/**
 * The parent turn on the Agents runtime that calls the builder. Only a system
 * agent (for example the Assistant on the Agents runtime) supplies it. The
 * parent thread must be an Agents execution thread, because the builder
 * session links to it as its parent.
 */
export interface BuilderParentExecution {
	/** Agents execution thread id of the parent session. */
	threadId: string;
	/**
	 * Instance agent id that owns the parent thread. The builder session, its
	 * checkpoints and its observational memory belong to it too.
	 */
	agentId: string;
	/** Working project of the parent thread. The builder session is stored in this project. */
	projectId: string;
	/** Execution id of the parent turn that starts or resumes this builder turn. */
	executionId: string;
	/** Execution counter of the parent turn, so the parent's limits include builder tokens. */
	executionCounter?: AgentExecutionCounter;
}

/**
 * Builder session options for the agent-builder sub-agent. `AgentsBuilderService`
 * only ever streams for Instance AI's build-agent tool, so every field the
 * host has already resolved (model, billing identity, telemetry) is required
 * rather than falling back to the builder's own settings/tracing chains.
 */
export interface InstanceAiBuilderSessionOptions {
	/** Persistence thread id for this builder session (e.g. `ia-builder:<instanceThreadId>:<agentId>`). */
	threadId: string;
	/** The visible Instance AI thread this build turn belongs to — builder OM usage is billed against this thread. */
	hostThreadId: string;
	/** The Instance AI run id this build turn belongs to — used for OM billing dedupe. */
	runId: string;
	/** Extra text appended to the builder prompt (e.g. instance-AI sub-agent rules). */
	instructionsAddendum?: string;
	/** Host-resolved model for the builder run — Instance AI's orchestrator model. */
	modelConfig: ModelConfig;
	/**
	 * Host-provided telemetry for this session (e.g. instance AI's parent-trace
	 * telemetry). When set, it replaces the builder's own LangSmith wiring so
	 * sub-agent spans join the host trace.
	 */
	telemetry?: Telemetry | BuiltTelemetry;
	/**
	 * Host's memory-task lease hook (`InstanceAiTraceContext.onMemoryTaskEvent`).
	 * When set, registered on the builder agent via `Agent.memoryTaskObserver()`
	 * so the builder's own observational-memory task events retain/release the
	 * host trace's telemetry provider, keeping its memory LLM spans exportable
	 * after the host trace's root finalizes.
	 */
	memoryTaskObserver?: (event: ScopedMemoryTaskEvent) => void;
	/** Host run's abort signal, so a user stop ends the builder's own loop rather than only the host's consumption of it. */
	abortSignal: AbortSignal;
	/** The parent orchestrator's validated, approval-wrapped MCP tools. */
	mcpTools?: InstanceAiToolRegistry;
	/** Use deterministic model catalogs for an Instance AI evaluation. */
	useEvalModelCatalog?: boolean;
	/** Reports host-owned artifacts requested by the embedded builder. Omitted in the standalone builder. */
	onRequiredArtifact?: (artifact: BuilderRequiredArtifact) => void;
	/**
	 * When set, each builder turn writes an execution thread and an execution
	 * row, linked to the parent turn. When absent, the builder records nothing.
	 */
	parentExecution?: BuilderParentExecution;
}

/**
 * The agent that owns the builder's checkpoints and memory. With a parent
 * execution (v2), it is the parent's instance agent, the same agent as the
 * builder's execution thread, so the normal session deletion removes all
 * builder state and deleting the built agent keeps it. Without one (v1),
 * it is the built agent, as before.
 */
export function getBuilderStateOwnerAgentId(
	targetAgentId: string,
	parentExecution?: Pick<BuilderParentExecution, 'agentId'>,
): string {
	return parentExecution?.agentId ?? targetAgentId;
}

interface BuilderTurnScope {
	/** The agent that the builder builds. */
	agentId: string;
	user: User;
	session: InstanceAiBuilderSessionOptions;
	parentExecution: BuilderParentExecution;
	/** The message of a start turn. Null for a resume. */
	userMessage: string | null;
	/** The suspended run that a resume continues. */
	resumeRunId?: string;
}

interface RecordedBuilderTurn {
	executionId: string;
	inputMessageIds: string[];
	recorder: ExecutionRecorder;
	/** Call when the runtime has claimed the run, so a failure counts as a started execution. */
	markStarted: () => void;
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly instanceAiCreditService: InstanceAiCreditService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly aiConfig: AiConfig,
		private readonly turnExecutionService: AgentTurnExecutionService,
		private readonly executionRepository: AgentExecutionRepository,
	) {}

	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		credentialService: InstanceAiCredentialService,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): AsyncGenerator<StreamChunk> {
		const builder = await this.createBuilderAgent(
			agentId,
			projectId,
			credentialProvider,
			credentialService,
			user,
			session,
		);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resourceId = user.id;
		const options = {
			abortSignal: session.abortSignal,
			// Keep billing a stopped builder turn for the tokens it already spent.
			recoverUsageOnAbort: true,
			...modelStreamStallOptions(this.aiConfig),
		};

		const { parentExecution } = session;
		if (!parentExecution) {
			const resultStream = await builder.stream(message, {
				persistence: { threadId: session.threadId, resourceId },
				...options,
			});
			yield* this.streamFromAgent(resultStream);
			return;
		}

		yield* this.streamRecordedTurn(
			{ agentId, user, session, parentExecution, userMessage: message },
			async (turn) => {
				if (!turn) {
					return await builder.stream(message, {
						persistence: { threadId: session.threadId, resourceId },
						...options,
						...executionCounterOption(parentExecution),
					});
				}
				const { executionId, inputMessageIds, markStarted } = turn;
				markStarted();
				return await builder.stream(bindExecutionInput(message, inputMessageIds), {
					persistence: {
						threadId: session.threadId,
						resourceId,
						hostMetadata: { [EXECUTION_METADATA_KEY]: executionId },
					},
					...options,
					...executionCounterOption(parentExecution),
				});
			},
		);
	}

	/**
	 * Resume a suspended builder tool call and yield the resulting stream chunks.
	 *
	 * The `runId` is supplied by the caller — it originates from the live
	 * `tool-call-suspended` chunk, from the `openSuspensions` sidecar returned
	 * by the chat controller's messages endpoints (history reload), or from
	 * the instance-AI delegate's `findOpenSuspensions`. A fresh builder agent
	 * is reconstructed every time; the SDK's `agent.resume(...)` rehydrates
	 * the suspended state from the persisted checkpoint, so the new instance
	 * picks up where the old one left off.
	 */
	async *resumeBuild(
		agentId: string,
		projectId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		credentialProvider: CredentialProvider,
		credentialService: InstanceAiCredentialService,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): AsyncGenerator<StreamChunk> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(
			runId,
			getBuilderStateOwnerAgentId(agentId, session.parentExecution),
		);
		if (checkpointStatus.status === 'expired') {
			this.logger.debug('Builder checkpoint unavailable', {
				runId,
				status: checkpointStatus.status,
			});
			throw new BuilderCheckpointUnavailableError('expired');
		}
		if (checkpointStatus.status === 'not-found') {
			this.logger.debug('Builder checkpoint unavailable', {
				runId,
				status: checkpointStatus.status,
			});
			throw new BuilderCheckpointUnavailableError('not-found');
		}

		const builder = await this.createBuilderAgent(
			agentId,
			projectId,
			credentialProvider,
			credentialService,
			user,
			session,
		);

		this.logger.debug('Resuming builder agent', { agentId, runId, toolCallId });

		const options = {
			runId,
			toolCallId,
			abortSignal: session.abortSignal,
			// Keep billing a stopped builder turn for the tokens it already spent.
			recoverUsageOnAbort: true,
			...modelStreamStallOptions(this.aiConfig),
		};

		const { parentExecution } = session;
		if (!parentExecution) {
			const resultStream = await builder.resume('stream', resumeData, options);
			yield* this.streamFromAgent(resultStream);
			return;
		}

		yield* this.streamRecordedTurn(
			{ agentId, user, session, parentExecution, userMessage: null, resumeRunId: runId },
			async (turn) => {
				if (!turn) {
					return await builder.resume('stream', resumeData, {
						...options,
						...executionCounterOption(parentExecution),
					});
				}
				const { executionId, recorder, markStarted } = turn;
				return await builder.resume('stream', resumeData, {
					...options,
					...executionCounterOption(parentExecution),
					hostMetadata: { [EXECUTION_METADATA_KEY]: executionId },
					onResumeClaimed: async () => {
						markStarted();
						recorder.recordHitlResponse(toolCallId, resumeData);
					},
				});
			},
		);
	}

	/**
	 * Expire a suspended builder checkpoint (e.g. when a host cannot render its
	 * question). Pass the parent execution of a recorded (v2) session, because
	 * its checkpoints belong to the parent's agent.
	 */
	async cancelCheckpoint(
		agentId: string,
		runId: string,
		parentExecution?: Pick<BuilderParentExecution, 'agentId'>,
	): Promise<void> {
		await this.n8nCheckpointStorage.delete(
			runId,
			getBuilderStateOwnerAgentId(agentId, parentExecution),
		);
	}

	// ---------------------------------------------------------------------------
	// Private — builder agent construction
	// ---------------------------------------------------------------------------

	/**
	 * Build a fresh builder `Agent` instance for the given target agent.
	 *
	 * Encapsulates: env-key validation, prompt assembly from current config,
	 * tool registration, memory storage, and checkpoint wiring. Called on
	 * every `buildAgent` / `resumeBuild` — resume rehydrates state from the
	 * persisted checkpoint via the SDK, so the new instance picks up where
	 * the previous one left off.
	 */
	private async createBuilderAgent(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		credentialService: InstanceAiCredentialService,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): Promise<RuntimeAgent> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		// Warm the node catalog in the background so the first node-related tool call
		// can reuse an initialized parser.
		void this.nodeCatalogService.initialize().catch((error) => {
			this.logger.warn('Failed to initialize node catalog in builder warmup', {
				error: error instanceof Error ? error.message : String(error),
				agentId,
			});
		});

		// Instance AI already resolved the run's model upstream; the builder
		// always runs on it directly.
		const modelConfig = session.modelConfig;

		const finalInstructions = this.createBuilderInstructions(session);
		const sessionContext = await this.createBuilderSessionContext(projectId, agentId);
		const runtimeSkills = getBuilderRuntimeSkills();

		const tools = this.agentsBuilderToolsService.getTools(
			agentId,
			projectId,
			credentialProvider,
			credentialService,
			user,
			{
				threadId: session.hostThreadId,
				runId: session.runId,
				...(session.useEvalModelCatalog ? { useEvalModelCatalog: true } : {}),
			},
		);

		const { Agent } = await import('@n8n/agents');
		const stateOwnerAgentId = getBuilderStateOwnerAgentId(agentId, session.parentExecution);
		const builderMemory = await this.createBuilderMemory(agentId, stateOwnerAgentId, user, session);

		const builder = new Agent(BUILDER_AGENT_NAME)
			.model(modelConfig)
			.instructions(finalInstructions)
			// Sent after the cached instructions so per-agent values do not break the cache.
			.volatileInstructionsProvider(async () => sessionContext)
			.skills(runtimeSkills)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(stateOwnerAgentId))
			.configuration({ maxIterations: 100 });
		const promptCaching = resolveAIAPromptCaching(modelConfig);
		if (promptCaching) {
			builder.promptCaching(promptCaching);
		}

		if (session.telemetry) builder.telemetry(session.telemetry);
		if (session.memoryTaskObserver) builder.memoryTaskObserver(session.memoryTaskObserver);

		await this.registerBuilderTools(builder, tools, agentId, session);

		builder.reasoning(resolveAIAReasoning(modelConfig));

		return builder;
	}

	/**
	 * Record one builder turn like a delegated run: an execution thread for the
	 * builder session, under the parent thread, and one execution row for the
	 * turn, linked to the parent turn. Each start and each resume links to the
	 * parent execution that calls it, because one builder session lives across
	 * many parent turns.
	 *
	 * The session belongs to the system agent of the parent and to the parent's
	 * working project, not to the built agent: the built agent never runs, and
	 * its session lists must not show builder sessions. The builder checkpoints
	 * and memory belong to the same agent (see `getBuilderStateOwnerAgentId`),
	 * so the admission finds them without an override. The memory thread keeps
	 * the built agent id as information.
	 *
	 * Recording is best-effort. When the record cannot start, the turn runs
	 * without one (`openStream` gets `undefined`). When the record cannot
	 * finalize, the turn result does not change. Failures of the turn itself
	 * still go to the caller.
	 */
	private async *streamRecordedTurn(
		scope: BuilderTurnScope,
		openStream: (turn: RecordedBuilderTurn | undefined) => Promise<StreamResult>,
	): AsyncGenerator<StreamChunk> {
		const { session, parentExecution } = scope;
		const executionLinks = await this.resolveExecutionLinks(scope);
		const recording: StartExecutionParams = {
			// The thread takes its access from the parent thread on creation.
			access: { accessScope: 'user', ownerId: scope.user.id },
			threadId: session.threadId,
			agentId: parentExecution.agentId,
			agentName: BUILDER_AGENT_NAME,
			projectId: parentExecution.projectId,
			userMessage: scope.userMessage,
			resourceId: scope.user.id,
			source: BUILDER_EXECUTION_SOURCE,
			...(scope.resumeRunId !== undefined
				? { resumeRunId: scope.resumeRunId, sessionMode: 'existing' as const }
				: {}),
			...(executionLinks !== undefined ? { executionLinks } : {}),
			threadMetadata: {
				parentThreadId: parentExecution.threadId,
				parentAgentId: parentExecution.agentId,
			},
		};
		const recorder = this.turnExecutionService.createRecorder(
			undefined,
			// The recorder writes timeline snapshots only after the admission below.
			() => executionId,
			recording,
		);
		session.abortSignal.throwIfAborted();
		const admission = await this.startBuilderRecord(scope, recording, recorder.startedAt);
		if (!admission) {
			session.abortSignal.throwIfAborted();
			yield* this.streamFromAgent(await openStream(undefined));
			return;
		}
		const { executionId } = admission;
		let executionStarted = false;
		let executionError: unknown;
		try {
			session.abortSignal.throwIfAborted();
			const resultStream = await openStream({
				executionId,
				inputMessageIds: admission.inputMessageIds,
				recorder,
				markStarted: () => {
					executionStarted = true;
				},
			});
			for await (const chunk of streamAgentChunks(resultStream.stream)) {
				recorder.record(chunk);
				if (chunk.type === 'error') executionError = chunk.error;
				yield chunk;
			}
		} catch (error) {
			executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			const record = recorder.getMessageRecord();
			let hitlStatus: 'suspended' | 'resumed' | undefined;
			if (recorder.suspended) hitlStatus = 'suspended';
			else if (scope.resumeRunId !== undefined && executionStarted) hitlStatus = 'resumed';
			try {
				await this.turnExecutionService.finalizeExecution({
					executionId,
					executionStarted,
					executionError,
					params: {
						...recording,
						record: session.abortSignal.aborted
							? { ...record, finishReason: 'cancelled', error: null }
							: record,
						hitlStatus,
					},
				});
			} catch (error) {
				// A throw here would replace the turn result or the turn error.
				this.logger.warn('Failed to finalize the builder execution record', {
					agentId: scope.agentId,
					threadId: session.threadId,
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Store the built agent id on the memory thread and admit the execution.
	 * Returns `undefined` and logs a warning when this fails, for example when
	 * another turn already runs on the thread.
	 */
	private async startBuilderRecord(
		scope: BuilderTurnScope,
		recording: StartExecutionParams,
		startedAt: Date,
	): Promise<AgentExecutionAdmission | undefined> {
		const { threadId } = scope.session;
		try {
			await this.n8nMemory.getImplementation(scope.parentExecution.agentId).saveThread({
				id: threadId,
				resourceId: scope.user.id,
				metadata: { [BUILT_AGENT_ID_METADATA_KEY]: scope.agentId },
			});
			return await this.turnExecutionService.startExecution(recording, startedAt);
		} catch (error) {
			this.logger.warn('Failed to start the builder execution record, running without it', {
				agentId: scope.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private async resolveExecutionLinks(
		scope: BuilderTurnScope,
	): Promise<AgentExecutionLinks | undefined> {
		try {
			return (
				(await this.executionRepository.findLinksForChildOf(scope.parentExecution.executionId)) ??
				undefined
			);
		} catch (error) {
			// Links serve usage reads only. A failed lookup must not stop the builder turn.
			this.logger.warn('Failed to resolve builder execution links', {
				agentId: scope.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/**
	 * Pump SDK stream chunks through to the caller. The runId is now carried
	 * on each `tool-call-suspended` chunk by the SDK, so this is just a
	 * plain reader→generator adapter.
	 */
	private async *streamFromAgent(resultStream: StreamResult): AsyncGenerator<StreamChunk> {
		for await (const value of streamAgentChunks(resultStream.stream)) {
			yield value;
		}
	}

	// ---------------------------------------------------------------------------
	// Private — open-suspension lookup
	// ---------------------------------------------------------------------------

	/**
	 * Find the latest open checkpoint for a chat thread so its interactive
	 * cards can be rebuilt after a page refresh. Pass the parent execution of a
	 * recorded (v2) session, because its checkpoints belong to the parent's agent.
	 */
	async findOpenCheckpointForThread(
		agentId: string,
		threadId: string,
		parentExecution?: Pick<BuilderParentExecution, 'agentId'>,
	): Promise<SerializableAgentState | null> {
		return await this.n8nCheckpointStorage.findSuspendedForThread(
			getBuilderStateOwnerAgentId(agentId, parentExecution),
			threadId,
		);
	}

	private async claimMemoryUsage(
		report: MemoryTaskUsageReport,
		agentId: string,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): Promise<void> {
		try {
			const items = tokenUsageToBuilderUsageItems(report.model, report.usage);
			if (items.length === 0) return;
			await this.instanceAiCreditService.claimRunUsage(
				user,
				session.hostThreadId,
				`${session.runId}:agent-builder:${agentId}:memory:${report.task}:${report.reportId}`,
				items,
				'completed',
			);
		} catch (error) {
			this.logger.warn('Failed to claim agent-builder observational-memory usage', {
				agentId,
				hostThreadId: session.hostThreadId,
				runId: session.runId,
				task: report.task,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Static per addendum, so every build with the same addendum shares one cached prompt. */
	private createBuilderInstructions(session: InstanceAiBuilderSessionOptions): string {
		const instructions = buildBuilderPrompt();
		return session.instructionsAddendum
			? `${instructions}\n\n${session.instructionsAddendum}`
			: instructions;
	}

	private async createBuilderSessionContext(projectId: string, agentId: string): Promise<string> {
		return buildBuilderSessionContext({
			agentPreviewPath: buildAgentPreviewPath(projectId, agentId),
			modelRecommendationsSection: await getModelRecommendationsSection(),
		});
	}

	private async createBuilderMemory(
		agentId: string,
		stateOwnerAgentId: string,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	) {
		const { Memory } = await import('@n8n/agents');

		// The usage dedupe key keeps the built agent id: one host run can build
		// several agents, and each build must claim its own usage.
		const onMemoryUsage = async (report: MemoryTaskUsageReport) =>
			await this.claimMemoryUsage(report, agentId, user, session);

		const storage = this.n8nMemory.getImplementation(stateOwnerAgentId);
		return new Memory().storage(storage).observationalMemory({
			observe: createObservationLogObserveFn(session.modelConfig, { onUsage: onMemoryUsage }),
			reflect: createObservationLogReflectFn(session.modelConfig, { onUsage: onMemoryUsage }),
		});
	}

	private async registerBuilderTools(
		builder: RuntimeAgent,
		tools: BuilderTools,
		agentId: string,
		session: InstanceAiBuilderSessionOptions,
	): Promise<void> {
		const { createPlannerTodosTool } = await import('@n8n/agents');
		const plannerTodosTool = createPlannerTodosTool({
			description: BUILDER_PLANNER_TODOS_DESCRIPTION,
			systemInstruction: BUILDER_PLANNER_TODOS_SYSTEM_INSTRUCTION,
		});
		const reportRequiredArtifactTool = await this.createRequiredArtifactTool(session);
		const builderTools = [
			...tools.json,
			...tools.shared,
			plannerTodosTool,
			...(reportRequiredArtifactTool ? [reportRequiredArtifactTool] : []),
		];
		const claimedToolNames = new Set(builderTools.map((tool) => tool.name));

		for (const tool of builderTools) {
			builder.tool(tool);
		}

		for (const [toolName, tool] of session.mcpTools ?? []) {
			if (claimedToolNames.has(toolName)) {
				this.logger.warn('Skipped MCP tool that conflicts with an agent builder tool', {
					toolName,
					agentId,
				});
				continue;
			}
			claimedToolNames.add(toolName);
			builder.tool(tool);
		}
	}

	private async createRequiredArtifactTool(session: InstanceAiBuilderSessionOptions) {
		if (!session.onRequiredArtifact) return undefined;
		const { Tool } = await import('@n8n/agents');
		return new Tool(REPORT_REQUIRED_ARTIFACT_TOOL_NAME)
			.description(
				'Report a workflow or data table that Instance AI must create outside the target Agent. ' +
					'Use relationship "agent-entrypoint" for a channel bridge that invokes the Agent; it will not be attached as an Agent tool.',
			)
			.input(reportRequiredArtifactInputSchema)
			.handler(async (input: ReportRequiredArtifactInput) => {
				session.onRequiredArtifact?.(input.artifact);
				return { ok: true };
			})
			.build();
	}
}

function executionCounterOption(parentExecution: BuilderParentExecution): {
	executionCounter?: AgentExecutionCounter;
} {
	return parentExecution.executionCounter !== undefined
		? { executionCounter: parentExecution.executionCounter }
		: {};
}
