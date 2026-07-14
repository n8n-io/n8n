import type { Agent as RuntimeAgent } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IAgentConfigurationTelemetryProperties } from '@/interfaces';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { TtlMap } from '@/utils/ttl-map';

import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';

export interface GetRuntimeParams {
	agentId: string;
	projectId: string;
	integrationType?: string;
	/** When true, load the published snapshot. */
	usePublishedVersion?: boolean;
	/**
	 * The calling n8n user. When present, the runtime is built with node/workflow
	 * tools filtered down to what this user can access, and the cache key is
	 * scoped to the user so different users never share a runtime. Absent for
	 * published/integration runs, which keep today's project-scoped runtime.
	 */
	user?: User;
}

export interface AgentRuntime {
	agent: RuntimeAgent;
	agentId: string;
	toolRegistry: ToolRegistry;
	projectId: string;
	telemetryConfiguration: IAgentConfigurationTelemetryProperties;
}

interface RuntimeInitialization {
	token: symbol;
	promise: Promise<AgentRuntime>;
}

@Service()
export class AgentRuntimeCacheService {
	/**
	 * Cached agent runtimes.  Keys follow the pattern:
	 *   Draft:     `{agentId}:draft[:{integrationType}][:user:{userId}]`
	 *   Published: `{agentId}:published[:{integrationType}]`
	 *
	 * TTL = 30 minutes — entries are evicted when the agent is idle so that
	 * memory is freed without requiring an explicit shutdown step.
	 *
	 * Separating draft and published with explicit prefixes prevents a draft
	 * runtime from being mistakenly returned to a published-agent execution.
	 *
	 * The `:user:{userId}` suffix only ever appears on draft keys — published
	 * runs never carry a `user` (see `GetRuntimeParams.user`), since they have
	 * no interactive n8n session to gate tools against. A draft runtime's tool
	 * list is filtered per-user at build time (see
	 * `AgentRuntimeReconstructionService.reconstructFromAgentEntity`), so two
	 * different users hitting the same draft agent must never resolve to the
	 * same cache entry — that would leak one user's tool access to the other.
	 */
	private readonly runtimes = new TtlMap<string, AgentRuntime>(30 * Time.minutes.toMilliseconds);

	private readonly runtimeInitializations = new Map<string, RuntimeInitialization>();

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly credentialsService: CredentialsService,
	) {}

	private computeRuntimeCacheKey(params: GetRuntimeParams): string {
		if (params.usePublishedVersion) {
			const parts = [params.agentId, 'published'];
			if (params.integrationType) parts.push(params.integrationType);
			return parts.join(':');
		}
		const parts = [params.agentId, 'draft'];
		if (params.integrationType) parts.push(params.integrationType);
		// Per-user runtimes have node/workflow tools filtered by that user's
		// access — keying by user id keeps them from colliding with each other
		// or with the unscoped (no-user) runtime.
		if (params.user) parts.push(`user:${params.user.id}`);
		return parts.join(':');
	}

	private isRuntimeCacheKeyForAgent(key: string, agentId: string): boolean {
		return key === agentId || key.startsWith(`${agentId}:`);
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
			if (this.isRuntimeCacheKeyForAgent(key, agentId)) {
				const entry = this.runtimes.get(key);
				this.runtimes.delete(key);
				if (entry) this.closeAgentResources(entry.agent, agentId);
			}
		}

		for (const key of this.runtimeInitializations.keys()) {
			if (this.isRuntimeCacheKeyForAgent(key, agentId)) {
				this.runtimeInitializations.delete(key);
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
				this.logger.warn(
					`[AgentRuntimeCacheService] Failed to publish agent-config-changed for ${agentId}`,
					{
						error: error instanceof Error ? error.message : String(error),
					},
				);
			});
	}

	/**
	 * Reconcile the local runtime cache when a peer main reports that an
	 * agent's configuration changed. The originating main has already cleared
	 * its own cache synchronously before publishing — this handler runs on
	 * every other main so the next request rebuilds the runtime from the
	 * current DB state.
	 */
	@OnPubSubEvent('agent-config-changed', { instanceType: 'main' })
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
			this.logger.warn('[AgentRuntimeCacheService] Failed to close agent resources on eviction', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/**
	 * Return a cached runtime, or reconstruct one from the DB.
	 */
	async getRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		const cacheKey = this.computeRuntimeCacheKey(params);

		const cached = this.runtimes.get(cacheKey);
		if (cached) return cached;

		const initialization = this.runtimeInitializations.get(cacheKey);
		if (initialization) return await initialization.promise;

		const token = Symbol(cacheKey);
		const runtimeInitialization: RuntimeInitialization = {
			token,
			promise: (async () => {
				const runtime = await this.reconstructRuntime(params);
				if (this.runtimeInitializations.get(cacheKey)?.token !== token) {
					this.closeAgentResources(runtime.agent, params.agentId);
					throw new Error(`Agent ${params.agentId} runtime initialization was invalidated`);
				}

				this.runtimes.set(cacheKey, runtime);
				const cachedRuntime = this.runtimes.get(cacheKey);
				if (!cachedRuntime) throw new Error(`Agent ${params.agentId} failed to reconstruct`);
				return cachedRuntime;
			})(),
		};
		runtimeInitialization.promise = runtimeInitialization.promise.finally(() => {
			if (this.runtimeInitializations.get(cacheKey)?.token === token) {
				this.runtimeInitializations.delete(cacheKey);
			}
		});
		this.runtimeInitializations.set(cacheKey, runtimeInitialization);

		return await runtimeInitialization.promise;
	}

	private async reconstructRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		const { agentId, projectId, integrationType, usePublishedVersion, user } = params;

		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

		const agentData: Agent = usePublishedVersion
			? getPublishedAgentSnapshot(agentEntity)
			: agentEntity;

		// `user` here is whatever `computeRuntimeCacheKey` above already keyed
		// this build on — undefined for published/integration runs, set for
		// in-app chat/resume/task-now. Forwarded to both the credential provider
		// (so credential lookups are scoped to what this user can access) and
		// the reconstruction service (so node/workflow tools the user can't run
		// are dropped before the runtime is built).
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const { agent: agentInstance, toolRegistry } =
			await this.agentRuntimeReconstructionService.reconstructFromAgentEntity(
				agentData,
				credentialProvider,
				integrationType,
				user,
			);

		return {
			agent: agentInstance,
			agentId,
			toolRegistry,
			projectId,
			telemetryConfiguration: buildAgentConfigurationTelemetry(agentData),
		};
	}
}
