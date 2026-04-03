import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRelationRepository, UserRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../agents-credential-provider';
import { AgentRepository } from '../repositories/agent.repository';

import { AgentChatBridge } from './agent-chat-bridge';
import { ComponentMapper } from './component-mapper';
import { loadChatSdk, loadMemoryState, loadSlackAdapter } from './esm-loader';

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

		const user = await this.resolveUser(userId);

		// Create credential provider scoped to this user (for agent execution)
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			user,
		);

		// Decrypt the integration credential to get platform tokens
		const decryptedData = await this.decryptCredential(credentialId, user);

		// Create platform-specific adapter
		const adapter = await this.createAdapter(integrationType, decryptedData);

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
		const { AgentsService } = await import('../agents.service');
		const agentService = Container.get(AgentsService);

		const bridge = AgentChatBridge.create(
			chat,
			agentId,
			agentService,
			credentialProvider,
			componentMapper,
			this.logger,
			userId,
			projectId,
		);

		// Initialize the Chat instance (connects adapters, state adapter, etc.)
		await chat.initialize();

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
	 * Return connection status and count for an agent.
	 */
	getStatus(agentId: string): {
		status: 'connected' | 'disconnected';
		connections: number;
		integrations: Array<{ type: string; credentialId: string }>;
	} {
		const integrations: Array<{ type: string; credentialId: string }> = [];
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
	 * Reconnect all agents that have integrations configured.
	 * Called on startup to restore connections.
	 */
	async reconnectAll(): Promise<void> {
		const agents = await this.agentRepository.find();
		for (const agent of agents) {
			if (!agent.integrations || agent.integrations.length === 0) continue;
			for (const integration of agent.integrations) {
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
		const decrypted = this.credentialsService.decrypt(credential, true);
		return decrypted as Record<string, unknown>;
	}

	/**
	 * Extract the bot token from a decrypted Slack credential.
	 *
	 * - `slackApi` stores the token as `accessToken`.
	 * - `slackOAuth2Api` stores the token inside `oauthTokenData.access_token`.
	 */
	private extractSlackBotToken(credential: Record<string, unknown>): string {
		// slackApi credential
		let token: string | undefined;

		if (typeof credential.accessToken === 'string' && credential.accessToken) {
			token = credential.accessToken;
		}

		// slackOAuth2Api credential — token lives in the nested oauthTokenData object
		if (!token) {
			const tokenData = credential.oauthTokenData as Record<string, unknown> | undefined;
			const oauthToken = tokenData?.access_token ?? tokenData?.accessToken;
			if (typeof oauthToken === 'string' && oauthToken) {
				token = oauthToken;
			}
		}

		if (!token) {
			throw new Error(
				'Could not extract a bot token from the Slack credential. ' +
					'Please ensure the credential has a valid access token.',
			);
		}

		if (!token.startsWith('xoxb-')) {
			const prefix = token.split('-')[0] ?? 'unknown';
			throw new Error(
				`The Slack credential contains a "${prefix}-" token, but agent integrations require a Bot User OAuth Token ("xoxb-"). ` +
					'You can find this in your Slack app under OAuth & Permissions → Bot User OAuth Token.',
			);
		}

		return token;
	}

	private extractSlackSigningSecret(credential: Record<string, unknown>): string {
		const secret = credential.signatureSecret;
		if (typeof secret === 'string' && secret) {
			return secret;
		}

		throw new Error(
			'The Slack credential is missing a signing secret, which is required for agent integrations. ' +
				'Edit the credential and add your Slack app\'s "Signing Secret" (found under Basic Information in the Slack API dashboard).',
		);
	}

	private async createAdapter(type: string, credential: Record<string, unknown>): Promise<unknown> {
		switch (type) {
			case 'slack': {
				const botToken = this.extractSlackBotToken(credential);
				const signingSecret = this.extractSlackSigningSecret(credential);
				const { createSlackAdapter } = await loadSlackAdapter();
				return createSlackAdapter({ botToken, signingSecret });
			}
			default:
				throw new Error(`Unsupported integration type: ${type}`);
		}
	}
}
