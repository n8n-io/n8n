import type {
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
import type { AgentJsonConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { tokenUsageToBuilderUsageItems } from '@n8n/instance-ai';
import { IsNull } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeCatalogService } from '@/node-catalog';

import { InstanceAiCreditService } from '../../instance-ai/instance-ai-credit.service';
import { InstanceAiModelService } from '../../instance-ai/instance-ai-model.service';
import { AgentsService } from '../agents.service';
import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { getModelRecommendationsSection } from './agents-builder-model-recommendations';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService, getAgentConfigHash } from './agents-builder-tools.service';
import { BuilderCheckpointUnavailableError } from './errors';
import { getBuilderRuntimeSkills } from './skills';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { streamAgentChunks } from '../utils/agent-stream';

interface FindSuspendedCheckpointOptions {
	includeUnscoped?: boolean;
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
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly instanceAiModelService: InstanceAiModelService,
		private readonly instanceAiCreditService: InstanceAiCreditService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly agentCheckpointRepository: AgentCheckpointRepository,
		private readonly agentsConfig: AgentsConfig,
	) {}

	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): AsyncGenerator<StreamChunk> {
		const builder = await this.createBuilderAgent(
			agentId,
			projectId,
			credentialProvider,
			user,
			session,
		);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resourceId = user.id;
		const resultStream = await builder.stream(message, {
			persistence: { threadId: session.threadId, resourceId },
		});

		yield* this.streamFromAgent(resultStream);
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
		user: User,
		session: InstanceAiBuilderSessionOptions,
	): AsyncGenerator<StreamChunk> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
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
			user,
			session,
		);

		this.logger.debug('Resuming builder agent', { agentId, runId, toolCallId });

		const resultStream = await builder.resume('stream', resumeData, {
			runId,
			toolCallId,
		});

		yield* this.streamFromAgent(resultStream);
	}

	/** Expire a suspended builder checkpoint (e.g. when a host cannot render its question), scoped to the agent that owns it. */
	async cancelCheckpoint(agentId: string, runId: string): Promise<void> {
		await this.n8nCheckpointStorage.delete(runId, agentId);
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

		const currentConfig = composeJsonConfig(agent) as unknown as AgentJsonConfig | null;
		const currentToolsMap = agent.tools ?? {};
		const toolList =
			Object.entries(currentToolsMap)
				.map(([id, t]) => `- ${id}: ${t.descriptor.name} -- ${t.descriptor.description}`)
				.join('\n') || '(none)';

		const configJson = currentConfig ? JSON.stringify(currentConfig, null, 2) : '(no config yet)';
		const modelRecommendationsSection = await getModelRecommendationsSection();
		const enabledModules = this.agentsConfig.modules;
		const instructions = buildBuilderPrompt({
			configJson,
			configHash: getAgentConfigHash(currentConfig),
			configUpdatedAt: agent.updatedAt.toISOString(),
			toolList,
			agentPreviewPath: buildAgentPreviewPath(projectId, agentId),
			modelRecommendationsSection,
			enabledModules,
		});
		const finalInstructions = session.instructionsAddendum
			? `${instructions}\n\n${session.instructionsAddendum}`
			: instructions;
		const runtimeSkills = getBuilderRuntimeSkills();

		const tools = this.agentsBuilderToolsService.getTools(
			agentId,
			projectId,
			credentialProvider,
			user,
		);

		const { Agent, Memory } = await import('@n8n/agents');

		// Builder observational memory is summarization work, not the build
		// itself, so it runs on Haiku 4.5 when the host is Anthropic-compatible;
		// otherwise fall back to the run's own model. The lookup is a best-effort
		// optimization — a failure here (proxy setup, credential resolution, etc.)
		// must not abort the build itself, so it falls back to the builder model.
		let memoryModel = modelConfig;
		try {
			const preferredMemoryModel =
				await this.instanceAiModelService.resolveBuilderMemoryModelConfig(user);
			if (preferredMemoryModel) memoryModel = preferredMemoryModel;
		} catch (error) {
			this.logger.warn(
				'Failed to resolve preferred agent-builder memory model; using builder model',
				{
					agentId,
					runId: session.runId,
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
		const onMemoryUsage = async (report: MemoryTaskUsageReport) => {
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
		};

		const builderMemory = new Memory()
			.storage(this.n8nMemory.getImplementation(agentId))
			.observationalMemory({
				observe: createObservationLogObserveFn(memoryModel, { onUsage: onMemoryUsage }),
				reflect: createObservationLogReflectFn(memoryModel, { onUsage: onMemoryUsage }),
			});

		const builder = new Agent('agent-builder')
			.model(modelConfig)
			.instructions(finalInstructions)
			.skills(runtimeSkills)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(agentId))
			.configuration({ maxIterations: 30 });

		if (session.telemetry) builder.telemetry(session.telemetry);
		if (session.memoryTaskObserver) builder.memoryTaskObserver(session.memoryTaskObserver);

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		return builder;
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
	 * Return the parsed state of the most recent non-expired suspended
	 * checkpoint for this agent, or `null` if there isn't one. Each pending
	 * tool call inside the state already carries its own `runId`, so callers
	 * don't need a separate runId from this helper.
	 */
	async findOpenCheckpoint(agentId: string): Promise<SerializableAgentState | null> {
		return await this.findSuspendedCheckpoint(agentId);
	}

	/**
	 * Like {@link findOpenCheckpoint}, but scoped to one chat thread. Used by
	 * the chat history endpoints to rebuild open interactive cards (with
	 * runIds) after a page refresh.
	 */
	async findOpenCheckpointForThread(
		agentId: string,
		threadId: string,
		options: FindSuspendedCheckpointOptions = {},
	): Promise<SerializableAgentState | null> {
		return await this.findSuspendedCheckpoint(agentId, threadId, options);
	}

	private async findSuspendedCheckpoint(
		agentId: string,
		threadId?: string,
		options: FindSuspendedCheckpointOptions = {},
	): Promise<SerializableAgentState | null> {
		const rows = await this.agentCheckpointRepository.find({
			where: options.includeUnscoped
				? [
						{ agentId, expired: false },
						{ agentId: IsNull(), expired: false },
					]
				: { agentId, expired: false },
			order: { updatedAt: 'DESC' },
			...(threadId === undefined && { take: 5 }),
		});
		for (const row of rows) {
			if (!row.state) continue;
			let parsed: SerializableAgentState;
			try {
				parsed = jsonParse<SerializableAgentState>(row.state);
			} catch {
				continue;
			}
			if (parsed.status !== 'suspended') continue;
			if (threadId !== undefined && parsed.persistence?.threadId !== threadId) continue;
			return parsed;
		}
		return null;
	}
}
