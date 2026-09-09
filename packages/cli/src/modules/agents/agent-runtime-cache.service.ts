import type { Agent as RuntimeAgent } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IAgentConfigurationTelemetryProperties } from '@/interfaces';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { TtlMap } from '@/utils/ttl-map';

import {
	hashAgentSandboxPrincipal,
	type AgentSandboxPrincipalHash,
} from './agent-sandbox-principal';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import type { UserToolAccessSnapshot } from './agent-runtime-reconstruction.service';
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
	 * scoped to the caller so different users never share a runtime. Absent for
	 * published/integration runs, which keep today's project-scoped runtime.
	 */
	user?: User;
	sandboxPrincipalHash?: AgentSandboxPrincipalHash;
	/** Disable background-job tools and wake hints for task-triggered runtimes. */
	allowBackgroundTasks?: boolean;
}

/**
 * How long a passing tool-access re-check stays valid. Cache hits inside this
 * window skip the DB checks entirely, so revoked access takes effect within
 * one interval instead of whenever the runtime happens to rebuild.
 */
const TOOL_ACCESS_RECHECK_INTERVAL_MS = Time.minutes.toMilliseconds;

export interface AgentRuntime {
	agent: RuntimeAgent;
	agentId: string;
	toolRegistry: ToolRegistry;
	projectId: string;
	telemetryConfiguration: IAgentConfigurationTelemetryProperties;
	/**
	 * Grants baked into the runtime's tool list by `filterToolsForUser`.
	 * The sliding TTL can keep an active runtime alive indefinitely, so these
	 * are re-checked on cache hits (debounced) rather than waiting for
	 * eviction. Absent when no user-gated tools made it into the runtime.
	 */
	userToolAccessSnapshot?: UserToolAccessSnapshot;
	/** Epoch ms of the last passing tool-access re-check (build counts as one). */
	toolAccessCheckedAt: number;
}

interface RuntimeInitialization {
	token: symbol;
	promise: Promise<AgentRuntime>;
}

@Service()
export class AgentRuntimeCacheService {
	/**
	 * Cached agent runtimes.  Keys follow the pattern:
	 *   Draft:     `{agentId}:draft[:{integrationType}][:{callerScope}]`
	 *   Published: `{agentId}:published[:{integrationType}][:{callerScope}]`
	 *
	 * TTL = 30 minutes of inactivity (sliding — each cache hit refreshes the
	 * expiry) so actively used runtimes stay cached while idle agents are
	 * evicted and their memory freed without an explicit shutdown step.
	 * Because the slide can keep a runtime alive indefinitely, user-scoped
	 * runtimes re-verify their baked-in tool access grants on hits (see
	 * `toolAccessStillCurrent`) so revocations don't outlive the cache.
	 *
	 * Separating draft and published with explicit prefixes prevents a draft
	 * runtime from being mistakenly returned to a published-agent execution.
	 *
	 * With sandbox support enabled, caller scope is the workspace principal.
	 * Without it, draft runtimes retain equivalent per-user isolation via a hash.
	 */
	private readonly runtimes = new TtlMap<string, AgentRuntime>(
		30 * Time.minutes.toMilliseconds,
		undefined,
		(runtime) => this.closeAgentResources(runtime.agent, runtime.agentId),
	);

	private readonly runtimeInitializations = new Map<string, RuntimeInitialization>();

	private readonly toolAccessRechecks = new WeakMap<AgentRuntime, Promise<boolean>>();

	private readonly activeRuntimeLeases = new WeakMap<RuntimeAgent, number>();

	private readonly runtimesPendingClose = new WeakMap<RuntimeAgent, string>();

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly credentialsService: CredentialsService,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
	) {}

	private computeRuntimeCacheKey(params: GetRuntimeParams): string {
		const sandboxEnabled = this.agentSandboxRuntimeService.isEnabled();
		const parts = [params.agentId, params.usePublishedVersion ? 'published' : 'draft'];
		if (params.integrationType) parts.push(params.integrationType);
		if (params.allowBackgroundTasks === false) parts.push('no-background-tasks');
		// Per-user runtimes have node/workflow tools filtered by that user's
		// access — keying by user id keeps them from colliding with each other
		// or with the unscoped (no-user) runtime.
		if (sandboxEnabled && params.sandboxPrincipalHash) {
			parts.push(`sandbox:${params.sandboxPrincipalHash}`);
		} else if (!params.usePublishedVersion && params.user) {
			parts.push(`user:${hashAgentSandboxPrincipal({ type: 'n8n-user', userId: params.user.id })}`);
		}
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
	private closeAgentResources(agent: RuntimeAgent, agentId: string): void {
		if (this.activeRuntimeLeases.has(agent)) {
			this.runtimesPendingClose.set(agent, agentId);
			return;
		}

		agent.close().catch((error) => {
			this.logger.warn('[AgentRuntimeCacheService] Failed to close agent resources on eviction', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private acquireRuntimeLease(runtime: AgentRuntime): AgentRuntime {
		const { agent } = runtime;
		this.activeRuntimeLeases.set(agent, (this.activeRuntimeLeases.get(agent) ?? 0) + 1);
		return runtime;
	}

	releaseRuntimeLease(agent: RuntimeAgent): void {
		const activeLeases = this.activeRuntimeLeases.get(agent);
		if (activeLeases === undefined) return;
		if (activeLeases > 1) {
			this.activeRuntimeLeases.set(agent, activeLeases - 1);
			return;
		}

		this.activeRuntimeLeases.delete(agent);
		const agentId = this.runtimesPendingClose.get(agent);
		if (agentId !== undefined) {
			this.runtimesPendingClose.delete(agent);
			this.closeAgentResources(agent, agentId);
		}
	}

	/**
	 * Return a leased cached runtime, or reconstruct one from the DB.
	 * Callers must release the lease in a `finally` block.
	 */
	async getRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		if (this.agentSandboxRuntimeService.isEnabled() && !params.sandboxPrincipalHash) {
			throw new UserError(
				'Agent workspace scope is missing and the runtime cannot be reconstructed',
			);
		}
		const cacheKey = this.computeRuntimeCacheKey(params);

		const cached = this.runtimes.get(cacheKey);
		if (cached) {
			const accessStillCurrent = await this.toolAccessStillCurrent(cached, params);
			const current = this.runtimes.get(cacheKey);
			// The awaited re-check may race with cache invalidation or replacement.
			if (current !== cached) {
				if (current) return this.acquireRuntimeLease(current);
			} else if (accessStillCurrent) {
				this.runtimes.touch(cacheKey);
				return this.acquireRuntimeLease(cached);
			} else {
				// Revoked grants: retire this runtime and rebuild below so the tool
				// list is re-filtered against the user's current access.
				this.runtimes.delete(cacheKey);
				this.closeAgentResources(cached.agent, params.agentId);
			}
		}

		const initialization = this.runtimeInitializations.get(cacheKey);
		if (initialization) return this.acquireRuntimeLease(await initialization.promise);

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

		return this.acquireRuntimeLease(await runtimeInitialization.promise);
	}

	/**
	 * Node/workflow tools are permission-filtered once at build time, so an
	 * actively used runtime kept alive by the sliding TTL would otherwise
	 * honor grants forever. Re-check the baked-in grants at most once per
	 * `TOOL_ACCESS_RECHECK_INTERVAL_MS`; hits inside the window are free.
	 */
	private async toolAccessStillCurrent(
		runtime: AgentRuntime,
		params: GetRuntimeParams,
	): Promise<boolean> {
		const { userToolAccessSnapshot } = runtime;
		const { user } = params;
		if (!userToolAccessSnapshot || !user) return true;
		if (Date.now() - runtime.toolAccessCheckedAt < TOOL_ACCESS_RECHECK_INTERVAL_MS) return true;

		const inFlight = this.toolAccessRechecks.get(runtime);
		if (inFlight) return await inFlight;

		const recheck = (async () => {
			try {
				const stillGranted = await this.agentRuntimeReconstructionService.userStillHasToolAccess(
					userToolAccessSnapshot,
					params.projectId,
					user,
				);
				if (stillGranted) runtime.toolAccessCheckedAt = Date.now();
				return stillGranted;
			} catch (error) {
				// Availability over freshness: a failing re-check must not take down
				// the chat — serve the cached runtime and retry next interval.
				runtime.toolAccessCheckedAt = Date.now();
				this.logger.warn('[AgentRuntimeCacheService] Failed to re-check tool access', {
					agentId: runtime.agentId,
					error: error instanceof Error ? error.message : String(error),
				});
				return true;
			}
		})();
		this.toolAccessRechecks.set(runtime, recheck);

		try {
			return await recheck;
		} finally {
			if (this.toolAccessRechecks.get(runtime) === recheck) {
				this.toolAccessRechecks.delete(runtime);
			}
		}
	}

	private async reconstructRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		const {
			agentId,
			projectId,
			integrationType,
			usePublishedVersion,
			user,
			sandboxPrincipalHash,
			allowBackgroundTasks,
		} = params;

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
		const reconstruction = this.agentRuntimeReconstructionService.reconstructFromAgentEntity(
			agentData,
			credentialProvider,
			usePublishedVersion ? 'production' : 'test',
			integrationType,
			user,
			undefined,
			usePublishedVersion ? 'integrated' : 'manual',
			sandboxPrincipalHash,
			undefined,
			allowBackgroundTasks,
		);
		const { agent: agentInstance, toolRegistry, userToolAccessSnapshot } = await reconstruction;

		return {
			agent: agentInstance,
			agentId,
			toolRegistry,
			projectId,
			telemetryConfiguration: buildAgentConfigurationTelemetry(agentData),
			...(userToolAccessSnapshot !== undefined ? { userToolAccessSnapshot } : {}),
			toolAccessCheckedAt: Date.now(),
		};
	}
}
