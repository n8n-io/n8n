import {
	isAgentCredentialIntegration,
	type AgentCredentialIntegration,
	type AgentIntegrationStatusResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRelationRepository, UserRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { UrlService } from '@/services/url.service';

import { AgentChatBridge } from './agent-chat-bridge';
import {
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from './agent-chat-integration';
import { ComponentMapper } from './component-mapper';
import { loadChatSdk, loadMemoryState } from './esm-loader';
import type { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';

// ---------------------------------------------------------------------------
// Chat SDK local interfaces
//
// The `chat` package is ESM-only, so we cannot import types at module level.
// These interfaces mirror the subset of the Chat SDK API we consume.
// ---------------------------------------------------------------------------

type WebhookHandler = (
	request: Request,
	options?: { waitUntil?: (task: Promise<unknown>) => void },
) => Promise<Response>;

interface ChatInstance {
	initialize(): Promise<void>;
	shutdown(): Promise<void>;
	webhooks: Record<string, WebhookHandler>;
	onNewMention: (handler: unknown) => void;
	onSubscribedMessage: (handler: unknown) => void;
	onAction: (handler: unknown) => void;
}

interface ChatAgentConnection {
	chat: ChatInstance;
	bridge: AgentChatBridge;
}

/**
 * Manages per-agent Chat SDK instances and their lifecycle.
 *
 * Each integration (e.g. Slack workspace) gets its own `Chat` instance keyed
 * by `agentId:type:credentialId`. This supports multiple integrations per agent
 * (two Slack workspaces, or Slack + Discord in the future).
 */
@Service()
export class ChatIntegrationService {
	private readonly connections = new Map<string, ChatAgentConnection>();

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly urlService: UrlService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
	) {}

	private connectionKey(agentId: string, type: string, credentialId: string): string {
		return `${agentId}:${type}:${credentialId}`;
	}

	/**
	 * Connect an agent to a chat platform via the Chat SDK.
	 *
	 * Creates a Chat instance with the appropriate adapter, initializes it,
	 * and wires up the AgentChatBridge for event handling.
	 */
	async connect(
		agentId: string,
		credentialId: string,
		integrationType: string,
		userId: string,
		projectId: string,
	): Promise<void> {
		const key = this.connectionKey(agentId, integrationType, credentialId);

		// Tear down existing connection if reconnecting
		if (this.connections.has(key)) {
			await this.disconnectOne(key);
		}

		const integration = this.integrationRegistry.require(integrationType);

		const user = await this.resolveUser(userId);

		// Decrypt the integration credential to get platform tokens
		const decryptedData = await this.decryptCredential(credentialId, user);

		const ctx: AgentChatIntegrationContext = {
			agentId,
			projectId,
			credentialId,
			credential: decryptedData,
			webhookUrlFor: (platform) => this.buildWebhookUrl(agentId, projectId, platform),
		};

		// Pre-connect hook — webhook-based platforms use this to detect
		// credential conflicts (e.g. a Telegram bot token already in use) and
		// abort the connect before we touch any external API.
		if (integration.onBeforeConnect) {
			await integration.onBeforeConnect(ctx);
		}

		// Delegate adapter construction to the platform implementation.
		const adapter = await integration.createAdapter(ctx);

		// Dynamic imports — chat packages are ESM-only, use loader to bypass CJS transform
		const { Chat } = await loadChatSdk();
		const { createMemoryState } = await loadMemoryState();

		// Use the platform type as the adapter key (e.g. 'slack') so that
		// bot.webhooks.slack maps correctly to the handler.
		const chat = new Chat({
			userName: `n8n-agent-${agentId}`,
			adapters: { [integrationType]: adapter } as Record<string, never>,
			state: createMemoryState(),
		});

		// Create supporting infrastructure
		const componentMapper = new ComponentMapper();

		// Lazy-import AgentsService to avoid circular DI dependency
		// eslint-disable-next-line import-x/no-cycle
		const { AgentsService } = await import('../agents.service');
		const agentService = Container.get(AgentsService);

		const bridge = AgentChatBridge.create(
			chat,
			agentId,
			agentService,
			componentMapper,
			this.logger,
			projectId,
			integrationType,
		);

		// Initialize the Chat instance (connects adapters, state adapter, etc.)
		await chat.initialize();

		// Post-initialize hooks (e.g. Telegram setWebhook) run AFTER chat is live.
		// If one throws we must shut the chat down, otherwise adapters/timers leak.
		if (integration.onAfterConnect) {
			try {
				await integration.onAfterConnect(ctx);
			} catch (error) {
				await chat.shutdown().catch((shutdownError: unknown) => {
					this.logger.warn(
						`[ChatIntegrationService] Shutdown after failed onAfterConnect threw: ${shutdownError instanceof Error ? shutdownError.message : String(shutdownError)}`,
					);
				});
				bridge.dispose();
				throw error;
			}
		}

		// The `chat` variable is returned by `new Chat(...)` from the ESM-only
		// package. Its runtime shape matches our local `ChatInstance` interface.
		// We validate the required methods exist before storing.
		const chatInstance = chat as ChatInstance;

		this.connections.set(key, {
			chat: chatInstance,
			bridge,
		});
		this.logger.info(`[ChatIntegrationService] Connected: ${key}`);
	}

	/**
	 * Disconnect one or all integrations for an agent.
	 * If `type` and `credentialId` are provided, disconnects only that integration.
	 * Otherwise disconnects all integrations for the agent.
	 */
	async disconnect(agentId: string, type?: string, credentialId?: string): Promise<void> {
		if (type && credentialId) {
			await this.disconnectOne(this.connectionKey(agentId, type, credentialId));
		} else {
			const keysToRemove = [...this.connections.keys()].filter((k) => k.startsWith(`${agentId}:`));
			for (const k of keysToRemove) {
				await this.disconnectOne(k);
			}
		}
	}

	/**
	 * Disconnect every active integration. Called on `leader-stepdown` so a
	 * demoted main releases all chat sessions (Telegram setWebhook, polling, etc.)
	 * before another main takes over.
	 */
	@OnLeaderStepdown()
	async disconnectAll(): Promise<void> {
		const keys = [...this.connections.keys()];
		for (const key of keys) {
			await this.disconnectOne(key);
		}
	}

	/**
	 * Diff the previous and next chat integrations of an agent and reconcile
	 * runtime connections accordingly. Used by `AgentsService.updateConfig`
	 * after the builder writes a new integrations array, and by
	 * `AgentsService.publishAgent` to wake up integrations that were persisted
	 * while the agent was still a draft.
	 *
	 * Disconnects of removed integrations always run (so unpublishing-then-
	 * editing works). Connects of newly-added integrations are gated on
	 * `agent.publishedVersion` — matching the controller's connect endpoint,
	 * which rejects unpublished agents, and `reconnectAll`, which only restores
	 * published agents. The integration entry stays persisted on the entity so
	 * it can be picked up later by `publishAgent` calling this method again.
	 *
	 * Connection failures are logged at the call site — this method propagates
	 * errors from disconnect but swallows connect errors per integration so a
	 * single bad credential doesn't block the others.
	 */
	async syncToConfig(
		agent: Agent,
		previous: AgentCredentialIntegration[],
		next: AgentCredentialIntegration[],
	): Promise<void> {
		const key = (i: AgentCredentialIntegration) => `${i.type}:${i.credentialId}`;
		const previousKeys = new Set(previous.map(key));
		const nextKeys = new Set(next.map(key));

		for (const integration of previous) {
			if (!nextKeys.has(key(integration))) {
				try {
					await this.disconnect(agent.id, integration.type, integration.credentialId);
				} catch (error) {
					this.logger.warn('[ChatIntegrationService] Disconnect during sync failed', {
						agentId: agent.id,
						type: integration.type,
						error,
					});
				}
			}
		}

		const additions = next.filter((i) => !previousKeys.has(key(i)));

		if (additions.length > 0 && !agent.publishedVersion) {
			this.logger.debug(
				'[ChatIntegrationService] Skipping connect for unpublished agent — entry persisted, will connect on publish',
				{ agentId: agent.id, pendingTypes: additions.map((i) => i.type) },
			);
			return;
		}

		// TODO: AgentCredentialIntegration has no record of *who* connected the
		// integration, so we have no anchor user identity to decrypt credentials
		// with on reconnect / sync. We fall back to probing project members until
		// one has `credential:read` on the integration credential.
		// Replace with a proper solution (fetching credentials should not depend on any specific user)
		const userIds = additions.length
			? await Container.get(ProjectRelationRepository).findUserIdsByProjectId(agent.projectId)
			: [];

		for (const integration of additions) {
			let connected = false;
			for (const userId of userIds) {
				try {
					await this.connect(
						agent.id,
						integration.credentialId,
						integration.type,
						userId,
						agent.projectId,
					);
					connected = true;
					break;
				} catch (error) {
					this.logger.debug('[ChatIntegrationService] Connect attempt failed during sync', {
						agentId: agent.id,
						userId,
						type: integration.type,
						error,
					});
				}
			}
			if (!connected) {
				this.logger.warn(
					'[ChatIntegrationService] Could not connect integration during sync — no project member had credential access',
					{ agentId: agent.id, type: integration.type, credentialId: integration.credentialId },
				);
			}
		}
	}

	/**
	 * Return connection status and count for an agent.
	 */
	getStatus(agentId: string): AgentIntegrationStatusResponse & { connections: number } {
		const integrations: AgentIntegrationStatusResponse['integrations'] = [];
		for (const k of this.connections.keys()) {
			if (k.startsWith(`${agentId}:`)) {
				// Key format: agentId:type:credentialId
				const parts = k.split(':');
				if (parts.length >= 3) {
					integrations.push({ type: parts[1], credentialId: parts.slice(2).join(':') });
				}
			}
		}
		return {
			status: integrations.length > 0 ? 'connected' : 'disconnected',
			connections: integrations.length,
			integrations,
		};
	}

	/**
	 * Return the first Chat instance for an agent, or undefined if not connected.
	 */
	getChatInstance(agentId: string): ChatInstance | undefined {
		for (const [k, conn] of this.connections) {
			if (k.startsWith(`${agentId}:`)) return conn.chat;
		}
		return undefined;
	}

	/**
	 * Return the webhook handler for a specific platform on an agent.
	 * This is the pre-built handler from `bot.webhooks[platform]` that
	 * accepts a Web API Request and returns a Web API Response.
	 *
	 * Looks up the connection by platform so that the correct Chat instance
	 * is used when an agent has multiple integrations (e.g. Slack + Discord).
	 */
	getWebhookHandler(agentId: string, platform: string): WebhookHandler | undefined {
		for (const [key, conn] of this.connections) {
			if (key.startsWith(`${agentId}:${platform}:`)) {
				return conn.chat.webhooks[platform];
			}
		}
		return undefined;
	}

	/**
	 * Reconnect all agents that have integrations configured. Called on startup
	 * (gated by `InstanceSettings.isLeader` in `AgentsModule.init()`) and on
	 * `leader-takeover` in multi-main mode.
	 */
	@OnLeaderTakeover()
	async reconnectAll(): Promise<void> {
		// Only reconnect integrations for published agents — an unpublished agent must not
		// receive events, so we don't even load it.
		const agents = await this.agentRepository.findPublished();
		for (const agent of agents) {
			if (!agent.integrations || agent.integrations.length === 0) continue;
			for (const integration of agent.integrations) {
				if (!isAgentCredentialIntegration(integration)) {
					continue;
				}

				const userIds = await Container.get(ProjectRelationRepository).findUserIdsByProjectId(
					agent.projectId,
				);
				if (userIds.length === 0) {
					this.logger.warn(
						`[ChatIntegrationService] No users found for project ${agent.projectId} — skipping reconnect for agent ${agent.id}`,
					);
					continue;
				}

				// Try each project member until one succeeds — the first user may not
				// have access to the integration credential.
				let connected = false;
				for (const userId of userIds) {
					try {
						await this.connect(
							agent.id,
							integration.credentialId,
							integration.type,
							userId,
							agent.projectId,
						);
						connected = true;
						break;
					} catch (error) {
						this.logger.debug(
							`[ChatIntegrationService] User ${userId} could not reconnect ${integration.type} for agent ${agent.id}: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}
				if (!connected) {
					this.logger.error(
						`[ChatIntegrationService] Failed to reconnect ${integration.type} for agent ${agent.id} — no project member could access the credential`,
					);
				}
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private async disconnectOne(key: string): Promise<void> {
		const conn = this.connections.get(key);
		if (!conn) return;

		try {
			await conn.chat.shutdown();
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Error during shutdown for ${key}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		conn.bridge.dispose();

		this.connections.delete(key);
		this.logger.info(`[ChatIntegrationService] Disconnected: ${key}`);
	}

	private async resolveUser(userId: string): Promise<User> {
		const user = await Container.get(UserRepository).findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) {
			throw new Error(`User ${userId} not found`);
		}
		return user;
	}

	private async decryptCredential(
		credentialId: string,
		user: User,
	): Promise<Record<string, unknown>> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}
		const decrypted = await this.credentialsService.decrypt(credential, true);
		return decrypted as Record<string, unknown>;
	}

	private buildWebhookUrl(agentId: string, projectId: string, platform: string): string {
		// getWebhookBaseUrl returns the URL with a trailing slash, honours the
		// WEBHOOK_URL env var used by n8n's other webhook triggers.
		const base = this.urlService.getWebhookBaseUrl();
		return `${base}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/${platform}`;
	}
}
