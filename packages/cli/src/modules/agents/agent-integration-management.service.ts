import {
	AgentIntegrationSchema,
	type AgentIntegrationConfig,
	type AgentIntegrationDisconnectWarning,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	AgentIntegrationPersistenceService,
	matchesIntegrationRef,
	type IntegrationDeltaResult,
	type IntegrationRef,
} from './agent-integration-persistence.service';
import type { AgentActor } from './agent-modification-telemetry.service';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentIntegrationManagementService {
	/** One in-flight channel mutation per agent; see {@link serializePerAgent}. */
	private readonly mutations = new Map<string, Promise<unknown>>();

	constructor(
		private readonly persistenceService: AgentIntegrationPersistenceService,
		private readonly credentialsService: CredentialsService,
		private readonly chatService: ChatIntegrationService,
		private readonly registry: ChatIntegrationRegistry,
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
	) {}

	async validateConfig(integration: unknown): Promise<AgentIntegrationConfig> {
		const parsed = await AgentIntegrationSchema.safeParseAsync(integration);
		if (!parsed.success) throw new BadRequestError(parsed.error.message);
		const result = parsed.data;
		this.registry.require(result.type).validateConfig?.(result);
		return result;
	}

	/**
	 * Add a channel, or swap one channel for another when `replaces` is given.
	 *
	 * A replacement is one operation on purpose: the new connection has to be
	 * live and the swap persisted before the old connection is released, so no
	 * failure can leave the agent with two live channels or none.
	 */
	async connect(options: {
		agent: Agent;
		user: User;
		integration: unknown;
		replaces?: IntegrationRef;
		modifiedBy?: AgentActor;
	}): Promise<{ integration: AgentIntegrationConfig; savedAgent: Agent }> {
		const integration = await this.validateConfig(options.integration);
		await this.assertUsableCredential(options.agent, options.user, integration);

		const result = await this.applyChange({
			agent: options.agent,
			user: options.user,
			add: integration,
			...(options.replaces ? { remove: options.replaces } : {}),
			modifiedBy: options.modifiedBy ?? 'user',
		});

		return { integration, savedAgent: result.agent };
	}

	async disconnect(options: {
		agent: Agent;
		user: User;
		type: string;
		credentialId: string;
		deleteExternalResource?: boolean;
		modifiedBy?: AgentActor;
	}): Promise<{ savedAgent: Agent; warning?: AgentIntegrationDisconnectWarning }> {
		const result = await this.applyChange({
			agent: options.agent,
			user: options.user,
			remove: { type: options.type, credentialId: options.credentialId },
			cleanupRemovedIntegration: true,
			deleteExternalResource: options.deleteExternalResource,
			modifiedBy: options.modifiedBy ?? 'user',
		});

		return {
			savedAgent: result.agent,
			...(result.warning ? { warning: result.warning } : {}),
		};
	}

	/**
	 * The single failure contract for channel mutations, shared by REST, MCP and
	 * Slack setup. Durable state and runtime state are ordered so that whichever
	 * step fails, the two still agree:
	 *
	 * 1. bring the new connection up — a failed startup persists nothing;
	 * 2. write the delta — a failed write restores the runtime to what it was;
	 * 3. release the replaced connection — only once the write is durable, so a
	 *    failed write leaves the existing channel live.
	 */
	private async applyChange(options: {
		agent: Agent;
		user: User;
		add?: AgentIntegrationConfig;
		remove?: IntegrationRef;
		cleanupRemovedIntegration?: boolean;
		deleteExternalResource?: boolean;
		modifiedBy: AgentActor;
	}): Promise<IntegrationDeltaResult & { warning?: AgentIntegrationDisconnectWarning }> {
		return await this.serializePerAgent(
			options.agent.id,
			async () => await this.runChange(options),
		);
	}

	/**
	 * Run one channel mutation per agent at a time.
	 *
	 * Steps 1 and 3 straddle the write, so two mutations on the same channel can
	 * interleave: a removal releasing after its write can tear down the
	 * connection a concurrent re-connect established before its own write, leaving
	 * the channel persisted with nothing running. Queueing them removes the
	 * interleaving outright. This is per-process — durable state is still
	 * protected by the compare-and-set, and runtime state is per-main anyway.
	 */
	private async serializePerAgent<T>(agentId: string, work: () => Promise<T>): Promise<T> {
		const previous = this.mutations.get(agentId) ?? Promise.resolve();
		const run = previous.catch(() => {}).then(work);
		this.mutations.set(agentId, run);
		try {
			return await run;
		} finally {
			if (this.mutations.get(agentId) === run) this.mutations.delete(agentId);
		}
	}

	private async runChange(options: {
		agent: Agent;
		user: User;
		add?: AgentIntegrationConfig;
		remove?: IntegrationRef;
		cleanupRemovedIntegration?: boolean;
		deleteExternalResource?: boolean;
		modifiedBy: AgentActor;
	}): Promise<IntegrationDeltaResult & { warning?: AgentIntegrationDisconnectWarning }> {
		const { agent, add } = options;
		// "Replace this channel with itself" is just a connect. Left as a removal,
		// step 3 would release the connection step 1 just brought up, because both
		// resolve to the same runtime connection.
		const remove =
			options.remove && add && matchesIntegrationRef(add, options.remove)
				? undefined
				: options.remove;

		// The entity can predate a publish or another channel write, so read the row
		// for both decisions that depend on it: whether to connect at all, and what
		// a rollback would restore to. The write does its own read and reconciles
		// anything that lands after this one.
		const state =
			add || options.cleanupRemovedIntegration
				? await this.agentRepository.findIntegrationState(agent.id)
				: null;
		const publishedBefore = state ? state.activeVersionId !== null : agent.activeVersionId !== null;

		// `connect` restarts a connection that is already live — a settings-only
		// save, or re-connecting the same credential — so a rollback has to know
		// whether step 1 created this connection or merely replaced it.
		//
		// An unpublished agent has no live channel to begin with: it never receives
		// events, so nothing was started for it to restore. The publication check is
		// what makes that explicit — `isChannelLive` reports a leader-routed channel
		// as live without being able to inspect the leader, so on its own it would
		// have a draft's failed pre-connect validation start a runtime.
		const wasLive = !!add && publishedBefore && this.chatService.isChannelLive(agent.id, add);
		const persistedBefore =
			add && state
				? (state.integrations ?? []).find((entry) => matchesIntegrationRef(entry, add))
				: undefined;

		let connected: boolean;
		try {
			connected = add ? await this.startRuntime(agent, add, publishedBefore) : false;
		} catch (error) {
			// `connect` releases the live connection before it builds the new one, so
			// a failed rebuild leaves a still-persisted channel with nothing running.
			if (wasLive) await this.restorePersistedRuntime(agent, persistedBefore);
			throw error;
		}

		let result: IntegrationDeltaResult;
		try {
			result = await this.persistenceService.applyIntegrationDelta(
				agent,
				{ add, remove },
				{ user: options.user, modifiedBy: options.modifiedBy },
			);
		} catch (error) {
			// Undo step 1 on this main only. Nothing durable changed, so the cluster's
			// view is still correct — broadcasting a disconnect would have every peer
			// tear down a runtime that is still persisted and still healthy. Neither
			// path touches thread subscriptions, which the row still justifies.
			if (connected && add) {
				if (wasLive && persistedBefore) {
					// `connect` releases the existing key before rebuilding, so restoring
					// both drops the failed attempt and puts the previous entry back.
					await this.restorePersistedRuntime(agent, persistedBefore);
				} else {
					await this.releaseRuntimeQuietly(agent, add);
				}
			}
			throw error;
		}

		if (add && result.published !== undefined) {
			connected = await this.reconcileRuntimeWithPublication(
				agent,
				add,
				connected,
				result.published,
			);
		}

		const isPublished = result.published ?? publishedBefore;
		let warning: AgentIntegrationDisconnectWarning | undefined;
		try {
			warning =
				result.removed && options.cleanupRemovedIntegration
					? await this.registry.get(result.removed.type)?.onRemove?.({
							agentId: agent.id,
							projectId: agent.projectId,
							credentialId: result.removed.credentialId,
							user: options.user,
							deleteExternalResource:
								// if not published, by default delete the external resource
								options.deleteExternalResource ?? !isPublished,
						})
					: undefined;
		} finally {
			if (remove) await this.releaseRemoved(agent, remove, result);
		}

		if (connected && add) {
			await this.chatService.broadcastIntegrationChange(agent.id, add, 'connect');
		}

		return { ...result, ...(warning ? { warning } : {}) };
	}

	/**
	 * Settle the runtime against the publication state the write actually read.
	 *
	 * Step 1 decides before the write, so it can only go on the caller's copy of
	 * `activeVersionId`, which a concurrent publish or unpublish can outdate.
	 * Without this, an agent published mid-request keeps a channel that was never
	 * started, and one unpublished mid-request gets a live channel — and a
	 * `connect` broadcast — while unpublished, which must never receive events.
	 */
	private async reconcileRuntimeWithPublication(
		agent: Agent,
		add: AgentIntegrationConfig,
		connected: boolean,
		published: boolean,
	): Promise<boolean> {
		if (connected && !published) {
			this.logger.info(
				'[AgentIntegrationManagementService] Agent was unpublished while its channel connected — releasing the runtime',
				{ agentId: agent.id, type: add.type },
			);
			// The entry stays persisted, so its subscriptions do too — as in
			// `unpublishAgent`, which preserves them for a later publish.
			await this.chatService.disconnectChannel(agent.id, add, { deleteSubscriptions: false });
			return false;
		}

		if (connected && published && !this.chatService.isChannelLive(agent.id, add)) {
			this.logger.info(
				'[AgentIntegrationManagementService] Channel runtime went away while the mutation was in flight — restarting it',
				{ agentId: agent.id, type: add.type },
			);
			return await this.startRuntimeQuietly(agent, add);
		}

		if (!connected && published) {
			this.logger.info(
				'[AgentIntegrationManagementService] Agent was published while its channel persisted — starting the runtime',
				{ agentId: agent.id, type: add.type },
			);
			// Already durable, so a failure here leaves it persisted-but-not-live —
			// the same contract `publishAgent` runs under via `syncToConfig`.
			return await this.startRuntimeQuietly(agent, add);
		}

		return connected;
	}

	/**
	 * Start a runtime for a channel that is already durable, so a failure must not
	 * fail the request — the next publish or restart picks it up.
	 */
	private async startRuntimeQuietly(agent: Agent, add: AgentIntegrationConfig): Promise<boolean> {
		try {
			return await this.startRuntime(agent, add, true);
		} catch (error) {
			this.logger.warn('[AgentIntegrationManagementService] Could not start the channel runtime', {
				agentId: agent.id,
				type: add.type,
				error,
			});
			return false;
		}
	}

	/**
	 * Start the runtime for an added channel.
	 *
	 * Unpublished agents never receive events, so their entry is persisted without
	 * a connection — matching `syncToConfig`, which picks it up on publish. They
	 * still get the pre-connect check, the only thing that would have rejected an
	 * unusable credential. `published` is a parameter because the authority for it
	 * differs before and after the write.
	 */
	private async startRuntime(
		agent: Agent,
		add: AgentIntegrationConfig,
		published: boolean,
	): Promise<boolean> {
		if (!published) {
			await this.chatService.validateBeforeConnect(agent.id, add, agent.projectId);
			return false;
		}

		// `connect` runs the pre-connect hook itself; running it twice would repeat
		// an external call for no benefit.
		await this.chatService.connect(agent.id, add, agent.projectId);
		return true;
	}

	/**
	 * Put the runtime back on the entry the row still holds.
	 *
	 * Used when a restart failed or its write did not land, so the channel is
	 * still persisted under its previous configuration and has to keep running
	 * under it. Best-effort: the original failure is what the caller reports.
	 */
	private async restorePersistedRuntime(
		agent: Agent,
		persisted: AgentIntegrationConfig | undefined,
	): Promise<void> {
		if (!persisted) return;

		try {
			await this.chatService.connect(agent.id, persisted, agent.projectId);
		} catch (error) {
			this.logger.warn(
				'[AgentIntegrationManagementService] Could not restore the previous channel runtime',
				{ agentId: agent.id, type: persisted.type, error },
			);
		}
	}

	/**
	 * Release a removed channel's runtime, after its removal is durable.
	 *
	 * When nothing was persisted under that reference — a builder draft entry, or
	 * an entry a concurrent request already removed — there is still a stray
	 * connection to clear, so tear the runtime down either way.
	 */
	private async releaseRemoved(
		agent: Agent,
		remove: IntegrationRef,
		result: IntegrationDeltaResult,
	): Promise<void> {
		if (result.removed) {
			await this.chatService.disconnectChannel(agent.id, result.removed);
			return;
		}

		this.logger.debug(
			'[AgentIntegrationManagementService] No persisted channel matched the removal — clearing runtime only',
			{ agentId: agent.id, type: remove.type },
		);
		await this.releaseRuntimeQuietly(agent, remove);

		// A peer main can still hold this connection — an earlier removal whose
		// broadcast was dropped leaves one behind — so tell the cluster too.
		// Draft references (`credentialId: ''`) are not a real connection anywhere
		// and fail this parse, which keeps them a local-only cleanup.
		const parsed = AgentIntegrationSchema.safeParse(remove);
		if (parsed.success) {
			await this.chatService.broadcastIntegrationChange(agent.id, parsed.data, 'disconnect');
		}
	}

	/**
	 * Release a channel's runtime without letting the failure surface.
	 *
	 * These are compensating teardowns: one runs while an error is already on its
	 * way to the caller, the other from a `finally` after the removal is durable.
	 * A leader-routed teardown can time out, and neither caller can act on that —
	 * reporting it would replace the failure that actually matters.
	 */
	private async releaseRuntimeQuietly(agent: Agent, integration: IntegrationRef): Promise<void> {
		try {
			await this.chatService.disconnect(agent.id, integration);
		} catch (error) {
			this.logger.warn(
				'[AgentIntegrationManagementService] Could not release the channel runtime',
				{
					agentId: agent.id,
					type: integration.type,
					error,
				},
			);
		}
	}

	private async assertUsableCredential(
		agent: Agent,
		user: User,
		integration: AgentIntegrationConfig,
	): Promise<void> {
		const implementation = this.registry.require(integration.type);

		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId: agent.projectId },
		);
		const credential = usableCredentials.find((item) => item.id === integration.credentialId);
		if (!credential) {
			throw new NotFoundError(`Credential "${integration.credentialId}" not found`);
		}
		if (!implementation.credentialTypes.includes(credential.type)) {
			throw new BadRequestError(
				`${implementation.displayLabel} integrations do not support ${credential.type} credentials`,
			);
		}
	}
}
