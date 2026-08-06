import type { Agent as RuntimeAgent } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

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
import { WorkflowToolWorkflowLoader } from './tools/workflow-tool-workflow-loader.service';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';

const AGENT_RUNTIME_CACHE_TTL_MS = 30 * Time.minutes.toMilliseconds;

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
	workflowVersionFingerprint: ReadonlyMap<string, string>;
}

export interface AgentRuntimeLease {
	runtime: AgentRuntime;
	release: () => void;
}

interface ManagedAgentRuntime {
	runtime: AgentRuntime;
	borrowers: number;
	retired: boolean;
}

interface RuntimeAcquisition {
	managedRuntime?: ManagedAgentRuntime;
}

interface RuntimeInitializationState {
	pendingAcquisitions: RuntimeAcquisition[];
	managedRuntime?: ManagedAgentRuntime;
}

interface RuntimeInitialization {
	token: symbol;
	promise: Promise<ManagedAgentRuntime>;
	state: RuntimeInitializationState;
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
	private readonly runtimes = new TtlMap<string, ManagedAgentRuntime>(
		AGENT_RUNTIME_CACHE_TTL_MS,
		AGENT_RUNTIME_CACHE_TTL_MS,
		(_key, managedRuntime) => this.retireRuntime(managedRuntime),
	);

	private readonly runtimeInitializations = new Map<string, RuntimeInitialization>();

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
		private readonly credentialsService: CredentialsService,
		private readonly workflowToolWorkflowLoader: WorkflowToolWorkflowLoader,
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
				if (entry) this.retireRuntime(entry);
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

	private retireRuntime(managedRuntime: ManagedAgentRuntime): void {
		if (managedRuntime.retired) return;
		managedRuntime.retired = true;
		if (managedRuntime.borrowers === 0) {
			this.closeAgentResources(managedRuntime.runtime.agent, managedRuntime.runtime.agentId);
		}
	}

	private retainRuntime(
		managedRuntime: ManagedAgentRuntime,
		acquisition: RuntimeAcquisition,
	): void {
		if (managedRuntime.retired) {
			throw new UnexpectedError(
				`Agent ${managedRuntime.runtime.agentId} runtime was retired before acquisition`,
			);
		}
		managedRuntime.borrowers++;
		acquisition.managedRuntime = managedRuntime;
	}

	private releaseRuntime(managedRuntime: ManagedAgentRuntime): void {
		if (managedRuntime.borrowers === 0) return;
		managedRuntime.borrowers--;
		if (managedRuntime.borrowers === 0 && managedRuntime.retired) {
			this.closeAgentResources(managedRuntime.runtime.agent, managedRuntime.runtime.agentId);
		}
	}

	private reserveRuntimeAcquisition(
		initialization: RuntimeInitialization,
		acquisition: RuntimeAcquisition,
	): void {
		if (initialization.state.managedRuntime) {
			this.retainRuntime(initialization.state.managedRuntime, acquisition);
			return;
		}
		initialization.state.pendingAcquisitions.push(acquisition);
	}

	private completeRuntimeInitialization(
		state: RuntimeInitializationState,
		managedRuntime: ManagedAgentRuntime,
	): void {
		state.managedRuntime = managedRuntime;
		for (const acquisition of state.pendingAcquisitions) {
			this.retainRuntime(managedRuntime, acquisition);
		}
		state.pendingAcquisitions.length = 0;
	}

	/**
	 * Return a cached runtime, or reconstruct one from the DB.
	 */
	async getRuntime(params: GetRuntimeParams): Promise<AgentRuntime> {
		return (await this.getManagedRuntime(params)).runtime;
	}

	async acquireRuntime(params: GetRuntimeParams): Promise<AgentRuntimeLease> {
		const acquisition: RuntimeAcquisition = {};
		const managedRuntime = await this.getManagedRuntime(params, acquisition);
		if (acquisition.managedRuntime !== managedRuntime) {
			throw new UnexpectedError(`Agent ${params.agentId} runtime acquisition was not retained`);
		}

		let released = false;
		return {
			runtime: managedRuntime.runtime,
			release: () => {
				if (released) return;
				released = true;
				this.releaseRuntime(managedRuntime);
			},
		};
	}

	private async getManagedRuntime(
		params: GetRuntimeParams,
		acquisition?: RuntimeAcquisition,
	): Promise<ManagedAgentRuntime> {
		const cacheKey = this.computeRuntimeCacheKey(params);

		const initialization = this.runtimeInitializations.get(cacheKey);
		if (initialization) {
			if (acquisition) this.reserveRuntimeAcquisition(initialization, acquisition);
			return await initialization.promise;
		}

		const cached = this.runtimes.get(cacheKey);
		if (cached?.runtime.workflowVersionFingerprint.size === 0) {
			if (acquisition) this.retainRuntime(cached, acquisition);
			return cached;
		}

		const token = Symbol(cacheKey);
		const initializationState: RuntimeInitializationState = {
			pendingAcquisitions: acquisition ? [acquisition] : [],
		};
		const runtimeInitialization: RuntimeInitialization = {
			token,
			state: initializationState,
			promise: (async () => {
				if (cached) {
					const isCurrent = await this.isWorkflowFingerprintCurrent(cached.runtime);
					this.assertRuntimeInitializationIsCurrent(cacheKey, token, params.agentId);

					if (isCurrent && this.runtimes.get(cacheKey) === cached) {
						this.completeRuntimeInitialization(initializationState, cached);
						return cached;
					}

					if (this.runtimes.get(cacheKey) === cached) {
						this.runtimes.delete(cacheKey);
						this.retireRuntime(cached);
					}
				}

				const runtime = await this.reconstructStableRuntime(params, cacheKey, token);
				this.assertRuntimeInitializationIsCurrent(cacheKey, token, params.agentId, runtime);

				const managedRuntime: ManagedAgentRuntime = {
					runtime,
					borrowers: 0,
					retired: false,
				};
				this.runtimes.set(cacheKey, managedRuntime);
				const cachedRuntime = this.runtimes.get(cacheKey);
				if (!cachedRuntime) {
					this.closeAgentResources(runtime.agent, params.agentId);
					throw new UnexpectedError(`Agent ${params.agentId} failed to reconstruct`);
				}
				this.completeRuntimeInitialization(initializationState, cachedRuntime);
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

	private assertRuntimeInitializationIsCurrent(
		cacheKey: string,
		token: symbol,
		agentId: string,
		runtimeToClose?: AgentRuntime,
	): void {
		if (this.runtimeInitializations.get(cacheKey)?.token === token) return;

		if (runtimeToClose) this.closeAgentResources(runtimeToClose.agent, agentId);
		throw new UnexpectedError(`Agent ${agentId} runtime initialization was invalidated`);
	}

	private async reconstructStableRuntime(
		params: GetRuntimeParams,
		cacheKey: string,
		token: symbol,
	): Promise<AgentRuntime> {
		for (let attempt = 0; attempt < 2; attempt++) {
			const runtime = await this.reconstructRuntime(params);
			this.assertRuntimeInitializationIsCurrent(cacheKey, token, params.agentId, runtime);

			let isCurrent: boolean;
			try {
				isCurrent = await this.isWorkflowFingerprintCurrent(runtime);
			} catch (error) {
				this.closeAgentResources(runtime.agent, params.agentId);
				throw error;
			}
			this.assertRuntimeInitializationIsCurrent(cacheKey, token, params.agentId, runtime);

			if (isCurrent) return runtime;
			this.closeAgentResources(runtime.agent, params.agentId);
		}

		throw new UnexpectedError(
			`Agent ${params.agentId} runtime could not stabilize its workflow published versions`,
		);
	}

	private async isWorkflowFingerprintCurrent(runtime: AgentRuntime): Promise<boolean> {
		const expected = runtime.workflowVersionFingerprint;
		if (expected.size === 0) return true;

		const current = await this.workflowToolWorkflowLoader.getPublishedVersionFingerprints(
			runtime.projectId,
			[...expected.keys()],
		);
		if (current.size !== expected.size) return false;

		for (const [workflowId, versionId] of expected) {
			if (current.get(workflowId) !== versionId) return false;
		}
		return true;
	}

	private buildWorkflowVersionFingerprint(toolRegistry: ToolRegistry): ReadonlyMap<string, string> {
		const fingerprint = new Map<string, string>();
		for (const entry of toolRegistry.values()) {
			if (entry.kind !== 'workflow') continue;
			if (entry.workflowId === undefined || entry.workflowVersionId === undefined) {
				throw new UnexpectedError(
					`Workflow tool ${entry.workflowName ?? 'unknown'} is missing its published version fingerprint`,
				);
			}

			const existingVersion = fingerprint.get(entry.workflowId);
			if (existingVersion !== undefined && existingVersion !== entry.workflowVersionId) {
				throw new UnexpectedError(
					`Workflow ${entry.workflowId} was reconstructed with conflicting published versions`,
				);
			}
			fingerprint.set(entry.workflowId, entry.workflowVersionId);
		}
		return fingerprint;
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
				usePublishedVersion ? 'production' : 'test',
				integrationType,
				user,
			);
		let workflowVersionFingerprint: ReadonlyMap<string, string>;
		try {
			workflowVersionFingerprint = this.buildWorkflowVersionFingerprint(toolRegistry);
		} catch (error) {
			this.closeAgentResources(agentInstance, agentId);
			throw error;
		}

		return {
			agent: agentInstance,
			agentId,
			toolRegistry,
			projectId,
			telemetryConfiguration: buildAgentConfigurationTelemetry(agentData),
			workflowVersionFingerprint,
		};
	}
}
