import {
	AgentIntegrationSchema,
	type AgentIntegrationConfig,
	type AgentIntegrationDisconnectWarning,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { runSerially } from '@n8n/utils/run-serially';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	AgentIntegrationPersistenceService,
	matchesIntegrationRef,
	type IntegrationDeltaResult,
	type IntegrationDelta,
} from './agent-integration-persistence.service';
import type { AgentActor } from './agent-modification-telemetry.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';
import type { IntegrationRef } from './utils/agent-channel';

interface IntegrationChangeOptions extends IntegrationDelta {
	agent: Agent;
	user: User;
	cleanupRemovedIntegration?: boolean;
	deleteExternalResource?: boolean;
	modifiedBy: AgentActor;
	pushRef?: string;
}

interface IntegrationRuntimeState {
	published: boolean;
	wasLive: boolean;
	persisted?: AgentIntegrationConfig;
}

@Service()
export class AgentIntegrationManagementService {
	/** Serialize channel changes per agent within this process. */
	private readonly mutations = new Map<string, Promise<unknown>>();

	constructor(
		private readonly persistenceService: AgentIntegrationPersistenceService,
		private readonly credentialsService: CredentialsService,
		private readonly chatService: ChatIntegrationService,
		private readonly registry: ChatIntegrationRegistry,
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
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
		pushRef?: string;
	}): Promise<{ integration: AgentIntegrationConfig; savedAgent: Agent }> {
		const integration = await this.validateConfig(options.integration);
		await this.assertUsableCredential(options.agent, options.user, integration);

		const result = await this.applyChange({
			agent: options.agent,
			user: options.user,
			add: integration,
			...(options.replaces ? { remove: options.replaces } : {}),
			modifiedBy: options.modifiedBy ?? 'user',
			pushRef: options.pushRef,
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
		pushRef?: string;
	}): Promise<{ savedAgent: Agent; warning?: AgentIntegrationDisconnectWarning }> {
		const result = await this.applyChange({
			agent: options.agent,
			user: options.user,
			remove: { type: options.type, credentialId: options.credentialId },
			cleanupRemovedIntegration: true,
			deleteExternalResource: options.deleteExternalResource,
			modifiedBy: options.modifiedBy ?? 'user',
			pushRef: options.pushRef,
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
	private async applyChange(
		options: IntegrationChangeOptions,
	): Promise<IntegrationDeltaResult & { warning?: AgentIntegrationDisconnectWarning }> {
		// Keep startup, persistence, and teardown in one queue to prevent interleaved changes.
		return await runSerially(
			this.mutations,
			options.agent.id,
			async () => await this.runChange(options),
		);
	}

	private async runChange(
		options: IntegrationChangeOptions,
	): Promise<IntegrationDeltaResult & { warning?: AgentIntegrationDisconnectWarning }> {
		const { agent, add } = options;
		// A self-replacement must not release the connection that it just started.
		const remove =
			options.remove && add && matchesIntegrationRef(add, options.remove)
				? undefined
				: options.remove;
		const previous = await this.loadRuntimeBeforeChange(options);
		let connected = await this.startAddedRuntime(options, previous);
		const result = await this.persistChange(options, remove, connected, previous);
		if (result.changed) {
			this.agentUpdateBroadcaster.notify(
				{ projectId: agent.projectId, agentId: agent.id, source: options.modifiedBy },
				options.pushRef,
			);
		}
		if (add && result.published !== undefined) {
			connected = await this.reconcileRuntimeWithPublication(
				agent,
				add,
				connected,
				result.published,
			);
		}
		const warning = await this.cleanupRemovedIntegration(
			options,
			remove,
			result,
			previous.published,
		);
		if (connected && add) {
			await this.chatService.broadcastIntegrationChange(agent.id, add, 'connect');
		}
		return { ...result, ...(warning ? { warning } : {}) };
	}

	private async cleanupRemovedIntegration(
		options: IntegrationChangeOptions,
		remove: IntegrationRef | undefined,
		result: IntegrationDeltaResult,
		publishedBefore: boolean,
	): Promise<AgentIntegrationDisconnectWarning | undefined> {
		const { agent } = options;
		const isPublished = result.published ?? publishedBefore;
		try {
			if (!result.removed || !options.cleanupRemovedIntegration) return undefined;
			return await this.registry.get(result.removed.type)?.onRemove?.({
				agentId: agent.id,
				projectId: agent.projectId,
				credentialId: result.removed.credentialId,
				user: options.user,
				// Draft channels delete their external resource by default.
				deleteExternalResource: options.deleteExternalResource ?? !isPublished,
			});
		} finally {
			if (remove) await this.releaseRemoved(agent, remove, result);
		}
	}

	private async persistChange(
		options: IntegrationChangeOptions,
		remove: IntegrationRef | undefined,
		connected: boolean,
		previous: IntegrationRuntimeState,
	): Promise<IntegrationDeltaResult> {
		const { agent, add } = options;
		try {
			return await this.persistenceService.applyIntegrationDelta(
				agent,
				{ add, remove },
				{ user: options.user, modifiedBy: options.modifiedBy },
			);
		} catch (error) {
			if (!connected || !add) throw error;
			// Roll back this main only. Other mains still match the durable state.
			if (previous.wasLive && previous.persisted) {
				await this.restorePersistedRuntime(agent, previous.persisted);
			} else {
				await this.releaseRuntimeQuietly(agent, add);
			}
			throw error;
		}
	}

	private async startAddedRuntime(
		{ agent, add }: IntegrationChangeOptions,
		previous: IntegrationRuntimeState,
	): Promise<boolean> {
		if (!add) return false;
		try {
			return await this.startRuntime(agent, add, previous.published);
		} catch (error) {
			// A failed reconnect has already released the previous runtime.
			if (previous.wasLive) await this.restorePersistedRuntime(agent, previous.persisted);
			throw error;
		}
	}

	private async loadRuntimeBeforeChange({
		agent,
		add,
		cleanupRemovedIntegration,
	}: IntegrationChangeOptions): Promise<IntegrationRuntimeState> {
		// The caller's entity can predate a publish or another channel write.
		const state =
			add || cleanupRemovedIntegration
				? await this.agentRepository.findIntegrationState(agent.id)
				: null;
		const published = state ? state.activeVersionId !== null : agent.activeVersionId !== null;
		// Leader-routed channels report live even for drafts. Check publication first.
		const wasLive = !!add && published && this.chatService.isChannelLive(agent.id, add);
		const persisted =
			add && state
				? (state.integrations ?? []).find((entry) => matchesIntegrationRef(entry, add))
				: undefined;
		return { published, wasLive, persisted };
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
