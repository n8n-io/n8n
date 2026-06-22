import { type Agent as RuntimeAgent, type CredentialProvider } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OperationalError, UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { TtlMap } from '@/utils/ttl-map';

import type { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { Agent } from './entities/agent.entity';
import type { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';

export interface GetRuntimeParams {
	agentId: string;
	projectId: string;
	n8nUserId?: string;
	integrationType?: string;
	/** When true, load the published snapshot; n8nUserId is derived from publishedById when omitted. */
	usePublishedVersion?: boolean;
}

interface RuntimeCacheHooks {
	createCredentialProvider(projectId: string): CredentialProvider;
	reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		integrationType?: string,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }>;
}

export interface AgentRuntime {
	agent: RuntimeAgent;
	agentId: string;
	toolRegistry: ToolRegistry;
	projectId: string;
}

export class AgentRuntimeCacheService {
	/**
	 * Cached agent runtimes.  Keys follow the pattern:
	 *   Draft:     `{agentId}:draft:{n8nUserId}`
	 *   Published: `{agentId}:published[:{integrationType}]`
	 *
	 * TTL = 30 minutes — entries are evicted when the agent is idle so that
	 * memory is freed without requiring an explicit shutdown step.
	 *
	 * Separating draft and published with explicit prefixes prevents a draft
	 * runtime from being mistakenly returned to a published-agent execution.
	 */
	private readonly runtimes = new TtlMap<
		string,
		{ agent: RuntimeAgent; agentId: string; toolRegistry: ToolRegistry; projectId: string }
	>(30 * Time.minutes.toMilliseconds);

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly hooks: RuntimeCacheHooks,
	) {}

	private computeRuntimeCacheKey(params: GetRuntimeParams): string {
		if (params.usePublishedVersion) {
			const parts = [params.agentId, 'published'];
			if (params.integrationType) parts.push(params.integrationType);
			return parts.join(':');
		}
		const parts = [params.agentId, 'draft'];
		if (params.n8nUserId) parts.push(params.n8nUserId);
		return parts.join(':');
	}

	/**
	 * Drop all cached runtimes (draft and published) for an agent and, in
	 * multi-main mode, broadcast the invalidation to peer mains so their
	 * caches stay in sync.
	 *
	 * Pass `skipBroadcast: true` from the pubsub handler to avoid a re-publish
	 * loop when applying an event received from another main.
	 */
	clearRuntimes(agentId: string, options: { skipBroadcast?: boolean } = {}): void {
		for (const key of this.runtimes.keys()) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				const entry = this.runtimes.get(key);
				this.runtimes.delete(key);
				if (entry) this.closeAgentResources(entry.agent, agentId);
			}
		}

		if (options.skipBroadcast) return;
		if (!this.globalConfig.multiMainSetup.enabled) return;

		void this.publisher
			.publishCommand({
				command: 'agent-config-changed',
				payload: { agentId },
			})
			.catch((error) => {
				this.logger.warn(`[AgentsService] Failed to publish agent-config-changed for ${agentId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	/**
	 * Reconcile the local runtime cache when a peer main reports that an
	 * agent's configuration changed. The originating main has already cleared
	 * its own cache synchronously before publishing — this handler runs on
	 * every other main so the next request rebuilds the runtime from the
	 * current DB state.
	 */
	handleAgentConfigChanged(payload: PubSubCommandMap['agent-config-changed']): void {
		this.clearRuntimes(payload.agentId, { skipBroadcast: true });
	}

	/**
	 * Best-effort close of an agent instance. Delegates to `agent.close()`
	 * which disposes the runtime and disconnects any attached MCP clients.
	 * Errors are logged but never thrown.
	 */
	private closeAgentResources(agent: { close(): Promise<void> }, agentId: string): void {
		agent.close().catch((error) => {
			this.logger.warn('[AgentsService] Failed to close agent resources on eviction', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/**
	 * Return a cached runtime, or reconstruct one from the DB.
	 */
	async getRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		const { agentId, projectId, integrationType, usePublishedVersion } = params;

		const cacheKey = this.computeRuntimeCacheKey(params);

		const cached = this.runtimes.get(cacheKey);
		if (cached) return cached;

		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

		let n8nUserId = params.n8nUserId;
		let agentData: Agent = agentEntity;

		if (usePublishedVersion) {
			agentData = this.getPublishedAgent(agentEntity);

			// Resolve n8n user from publishedById when not provided by the caller.
			n8nUserId ??= agentEntity.activeVersion?.publishedById ?? undefined;
		}

		if (!n8nUserId) {
			throw new UserError('Agent user owner id is required');
		}

		const credentialProvider = this.hooks.createCredentialProvider(projectId);
		const { agent: agentInstance, toolRegistry } = await this.hooks.reconstructFromConfig(
			agentData,
			credentialProvider,
			n8nUserId,
			integrationType,
		);

		this.runtimes.set(cacheKey, { agent: agentInstance, agentId, toolRegistry, projectId });
		const runtime = this.runtimes.get(cacheKey);
		if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		return runtime;
	}

	getPublishedAgent(agentEntity: Agent): Agent {
		const activeVersionSchema = agentEntity.activeVersion?.schema;
		if (!activeVersionSchema) {
			throw new OperationalError(
				'Agent is not published. Publish the agent before using it in a workflow.',
			);
		}

		return {
			...agentEntity,
			schema: activeVersionSchema,
			tools: agentEntity.activeVersion?.tools ?? agentEntity.tools ?? {},
			skills: agentEntity.activeVersion?.skills ?? agentEntity.skills ?? {},
		} as Agent;
	}

	/**
	 * Reconstruct an agent from its JSON config using buildFromJson().
	 * This is the execution path for JSON-config agents.
	 */
	async reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		integrationType?: string,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		return await this.agentRuntimeReconstructionService.reconstructFromAgentEntity(
			agentEntity,
			credentialProvider,
			userId,
			integrationType,
		);
	}
}
