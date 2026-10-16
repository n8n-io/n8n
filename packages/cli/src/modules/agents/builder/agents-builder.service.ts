import type {
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	Agent as RuntimeAgent,
} from '@n8n/agents';
import { createObservationLogObserveFn, createObservationLogReflectFn } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@n8n/errors';
import { NodeCatalogService } from '@/node-catalog';

import { AgentsService } from '../agents.service';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';
import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { getModelRecommendationsSection } from './agents-builder-model-recommendations';
import { buildBuilderPrompt, buildBuilderSessionContext } from './agents-builder-prompts';
import { AgentsBuilderToolsService, type BuilderTools } from './agents-builder-tools.service';
import { BuilderCheckpointUnavailableError } from './errors';
import { getBuilderRuntimeSkills } from './skills';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import { streamAgentChunks } from '../utils/agent-stream';

import type { BuilderCredentialService, BuilderSessionOptions } from './builder-session';

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly aiConfig: AiConfig,
	) {}

	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		credentialService: BuilderCredentialService,
		user: User,
		session: BuilderSessionOptions,
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
		const resultStream = await builder.stream(message, {
			persistence: { threadId: session.threadId, resourceId },
			abortSignal: session.abortSignal,
			// Keep billing a stopped builder turn for the tokens it already spent.
			recoverUsageOnAbort: true,
			...modelStreamStallOptions(this.aiConfig),
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
		credentialService: BuilderCredentialService,
		user: User,
		session: BuilderSessionOptions,
	): AsyncGenerator<StreamChunk> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId, agentId);
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

		const resultStream = await builder.resume('stream', resumeData, {
			runId,
			toolCallId,
			abortSignal: session.abortSignal,
			// Keep billing a stopped builder turn for the tokens it already spent.
			recoverUsageOnAbort: true,
			...modelStreamStallOptions(this.aiConfig),
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
		credentialService: BuilderCredentialService,
		user: User,
		session: BuilderSessionOptions,
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
				track: session.track,
				...(session.useEvalModelCatalog ? { useEvalModelCatalog: true } : {}),
			},
		);

		const { Agent } = await import('@n8n/agents');
		const builderMemory = await this.createBuilderMemory(agentId, session);

		const builder = new Agent('agent-builder')
			.model(modelConfig)
			.instructions(finalInstructions)
			// Sent after the cached instructions so per-agent values do not break the cache.
			.volatileInstructionsProvider(async () => sessionContext)
			.skills(runtimeSkills)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(agentId))
			.configuration({ maxIterations: 100 });
		const promptCaching = session.promptCaching;
		if (promptCaching) {
			builder.promptCaching(promptCaching);
		}

		if (session.telemetry) builder.telemetry(session.telemetry);
		if (session.memoryTaskObserver) builder.memoryTaskObserver(session.memoryTaskObserver);

		this.registerBuilderTools(builder, tools, agentId, session);

		builder.reasoning(session.reasoning);

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
	 * Find the latest open checkpoint for a chat thread so its interactive
	 * cards can be rebuilt after a page refresh.
	 */
	async findOpenCheckpointForThread(
		agentId: string,
		threadId: string,
	): Promise<SerializableAgentState | null> {
		return await this.n8nCheckpointStorage.findSuspendedForThread(agentId, threadId);
	}

	/** Static per addendum, so every build with the same addendum shares one cached prompt. */
	private createBuilderInstructions(session: BuilderSessionOptions): string {
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

	private async createBuilderMemory(agentId: string, session: BuilderSessionOptions) {
		const { Memory } = await import('@n8n/agents');

		return new Memory().storage(this.n8nMemory.getImplementation(agentId)).observationalMemory({
			observe: createObservationLogObserveFn(session.modelConfig, {
				onUsage: session.onMemoryUsage,
			}),
			reflect: createObservationLogReflectFn(session.modelConfig, {
				onUsage: session.onMemoryUsage,
			}),
		});
	}

	private registerBuilderTools(
		builder: RuntimeAgent,
		tools: BuilderTools,
		agentId: string,
		session: BuilderSessionOptions,
	): void {
		const builderTools = [...tools.json, ...tools.shared, ...session.hostTools];
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
}
