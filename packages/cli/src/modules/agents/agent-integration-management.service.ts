import { AgentIntegrationSchema, type AgentIntegrationConfig } from '@n8n/api-types';
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

@Service()
export class AgentIntegrationManagementService {
	constructor(
		private readonly persistenceService: AgentIntegrationPersistenceService,
		private readonly credentialsService: CredentialsService,
		private readonly chatService: ChatIntegrationService,
		private readonly registry: ChatIntegrationRegistry,
		private readonly logger: Logger,
	) {}

	async validateConfig(input: unknown): Promise<AgentIntegrationConfig> {
		const parsed = await AgentIntegrationSchema.safeParseAsync(input);
		if (!parsed.success) throw new BadRequestError(parsed.error.message);

		const integration = parsed.data;
		this.registry.require(integration.type).validateConfig?.(integration);
		return integration;
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
		modifiedBy?: AgentActor;
	}): Promise<{ savedAgent: Agent }> {
		const result = await this.applyChange({
			agent: options.agent,
			user: options.user,
			remove: { type: options.type, credentialId: options.credentialId },
			modifiedBy: options.modifiedBy ?? 'user',
		});

		return { savedAgent: result.agent };
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
		modifiedBy: AgentActor;
	}): Promise<IntegrationDeltaResult> {
		const { agent, add } = options;
		// "Replace this channel with itself" is just a connect. Left as a removal,
		// step 3 would release the connection step 1 just brought up, because both
		// resolve to the same runtime connection.
		const remove =
			options.remove && add && matchesIntegrationRef(add, options.remove)
				? undefined
				: options.remove;

		// `connect` restarts a connection that is already live — a settings-only
		// save, or re-connecting the same credential — so a rollback has to know
		// whether step 1 created this connection or merely replaced it.
		const wasLive = !!add && this.chatService.getChatInstance(agent.id, add) !== undefined;
		let connected = add
			? await this.startRuntime(agent, add, agent.activeVersionId !== null)
			: false;

		let result: IntegrationDeltaResult;
		try {
			result = await this.persistenceService.applyIntegrationDelta(
				agent,
				{ add, remove },
				{ user: options.user, modifiedBy: options.modifiedBy },
			);
		} catch (error) {
			// Undo step 1 only where it created something: an already-live channel is
			// still persisted, so tearing it down would take a working channel offline
			// over a failed write. Subscriptions always stay — deletion is not
			// recoverable.
			if (connected && add && !wasLive) {
				await this.chatService.disconnectChannel(agent.id, add, { deleteSubscriptions: false });
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

		if (remove) await this.releaseRemoved(agent, remove, result);
		if (connected && add) {
			await this.chatService.broadcastIntegrationChange(agent.id, add, 'connect');
		}

		return result;
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

		if (!connected && published) {
			this.logger.info(
				'[AgentIntegrationManagementService] Agent was published while its channel persisted — starting the runtime',
				{ agentId: agent.id, type: add.type },
			);
			// Already durable, so a failure here leaves it persisted-but-not-live —
			// the same contract `publishAgent` runs under via `syncToConfig`.
			try {
				return await this.startRuntime(agent, add, true);
			} catch (error) {
				this.logger.warn(
					'[AgentIntegrationManagementService] Could not start the runtime after a concurrent publish',
					{ agentId: agent.id, type: add.type, error },
				);
				return false;
			}
		}

		return connected;
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
		await this.chatService.disconnect(agent.id, remove);

		// A peer main can still hold this connection — an earlier removal whose
		// broadcast was dropped leaves one behind — so tell the cluster too.
		// Draft references (`credentialId: ''`) are not a real connection anywhere
		// and fail this parse, which keeps them a local-only cleanup.
		const parsed = AgentIntegrationSchema.safeParse(remove);
		if (parsed.success) {
			await this.chatService.broadcastIntegrationChange(agent.id, parsed.data, 'disconnect');
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
