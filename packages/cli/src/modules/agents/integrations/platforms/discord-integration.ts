import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';

import {
	AgentChatIntegration,
	type AgentChatIntegrationContext,
	type ApprovalDecisionMessageParams,
	type BridgeExecutionContext,
	type BridgeMessageContextParams,
	type BridgeResumeExecutionContext,
	type PlatformAgentContext,
	type PlatformContextQueryParams,
} from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';
import type { SuspendComponent } from '../component-mapper';
import { loadDiscordAdapter } from '../esm-loader';
import {
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from '../integration-tool-definitions';
import {
	DiscordGateway,
	type DiscordConnection,
	type DiscordGatewayAdapter,
} from './discord-gateway';
import { executeDiscordContextQuery } from './discord-operations';
import { startTypingIndicator } from './typing-indicator';

/** Discord's typing indicator expires after ~10s, so keep it alive on an interval. */
const DISCORD_TYPING_REFRESH_MS = 8000;

/**
 * Pinned rather than read from `DISCORD_API_URL`: the adapter falls back to that
 * env var for every option we omit, and on a multi-tenant instance a stray host
 * variable must not redirect bot tokens.
 */
const DISCORD_API_URL = 'https://discord.com/api/v10';

/**
 * Discord platform integration.
 *
 * Discord is the first channel whose events arrive over two transports at
 * once: HTTP interactions carry button clicks and slash commands, while
 * ordinary messages arrive only over a persistent Gateway WebSocket.
 *
 * That is why this integration does NOT override `requiresLeader()`. Every
 * main connects, so every main can answer interactions routed to it by the
 * load balancer, and only the leader opens a Gateway socket — the same split
 * `ActiveWorkflowManager` uses for webhooks versus non-webhook triggers.
 *
 * Two capability flags follow Telegram's reasoning:
 * - {@link needsShortCallbackData} — Discord's `custom_id` caps at 100 chars.
 * - {@link disableStreaming} — post-and-edit streaming hits Discord's message
 *   edit rate limits and ships half-formed Markdown on intermediate frames.
 */
@Service()
export class DiscordIntegration extends AgentChatIntegration {
	readonly type = 'discord';

	readonly credentialTypes = ['discordBotApi'];

	readonly displayLabel = 'Discord';

	readonly displayIcon = 'discord';

	readonly builderGuidance = {
		capabilities: [
			'Receive Discord mentions and direct messages as agent triggers.',
			'Respond in Discord channels, threads, and direct messages.',
			'Edit existing messages in the current Discord conversation.',
			'Render Discord embeds with buttons.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Discord or act as a Discord bot.',
			'The agent needs to reply to Discord users in the same conversation context.',
			'The agent needs to update a Discord message in the current conversation.',
			'The agent should send Discord messages as the connected Discord bot.',
		],
		useNodeToolWhen: [
			'Discord is only a backend API step and the agent does not need to be connected as a Discord chat surface.',
			'The request is a one-off Discord operation from another trigger without ongoing Discord conversation context.',
		],
	};

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'divider',
		'fields',
		'image',
	];

	readonly actionToolDefinitions = resolveIntegrationActionDefinitions([
		'respond',
		'send_dm',
		'send_channel_message',
		'edit_message',
	]);

	readonly contextToolDefinitions = resolveIntegrationContextQueryDefinitions([
		'get_current_message_context',
		'get_current_subject',
		'search_channels',
	]);

	readonly contextToolGuidance = [
		'Use search_channels to turn a channel name such as "general" into a channel ID. It searches every Discord server the bot has been invited to, so the same name can appear more than once — the guildName on each result tells them apart.',
	];

	readonly actionToolGuidance = [
		'For edit_message, pass the messageId returned by a previous Discord action or get_current_message_context. The current Discord conversation is selected automatically.',
		'After a Discord button callback, edit the source message promptly so stale buttons are removed.',
		'For send_channel_message, channelId must be shaped "discord:<guildId>:<channelId>" — pass the value returned by search_channels or get_current_message_context. A bare Discord channel ID copied from the Discord app is rejected.',
		'A Discord mention is answered inside a thread created off that message. Use send_channel_message when the reply belongs in the channel itself rather than that thread.',
	];

	readonly needsShortCallbackData = true;

	readonly disableStreaming = true;

	/**
	 * Discord acknowledges a button click with `DeferredUpdateMessage`, which
	 * promises Discord an edit of the source message. Deleting it instead would
	 * break that contract, so the approval card is settled in place.
	 */
	readonly deleteActionMessageBeforeResume = false;

	/**
	 * Connections built by {@link createAdapter}, awaiting the `onConnected` hook
	 * that runs once the Chat instance has been initialized. Keyed by
	 * `agentId:credentialId`.
	 */
	private readonly pendingConnections = new Map<string, DiscordConnection>();

	private readonly gateway: DiscordGateway;

	constructor(logger: Logger, instanceSettings: InstanceSettings) {
		super();
		this.gateway = new DiscordGateway(logger, instanceSettings);
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const botToken = this.extractBotToken(ctx.credential);
		const publicKey = this.extractPublicKey(ctx.credential);
		const applicationId = this.extractApplicationId(ctx.credential);

		const { createDiscordAdapter } = await loadDiscordAdapter();

		// Every option is passed explicitly: the adapter falls back to
		// `process.env` for anything omitted (DISCORD_MENTION_ROLE_IDS,
		// DISCORD_API_URL, ...), which on a multi-tenant instance would let an
		// ambient host variable change behaviour for every agent.
		const adapter = createDiscordAdapter({
			botToken,
			publicKey,
			applicationId,
			mentionRoleIds: [],
			apiUrl: DISCORD_API_URL,
		});

		this.pendingConnections.set(this.sessionKey(ctx), {
			adapter: adapter as unknown as DiscordGatewayAdapter,
			botToken,
		});

		return adapter;
	}

	async onConnected(ctx: AgentChatIntegrationContext): Promise<void> {
		const key = this.sessionKey(ctx);
		const connection = this.pendingConnections.get(key);
		this.pendingConnections.delete(key);
		if (!connection) return;

		await this.gateway.discard(key);
		this.gateway.register(key, connection);
	}

	async onDisconnected(ctx: AgentChatIntegrationContext): Promise<void> {
		const key = this.sessionKey(ctx);
		this.pendingConnections.delete(key);
		await this.gateway.discard(key);
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		const { agentId, integration } = params.descriptor;
		const botToken = this.gateway.botTokenFor(`${agentId}:${integration.credentialId}`);

		return await executeDiscordContextQuery({
			apiUrl: DISCORD_API_URL,
			botToken,
			query: params.query,
			input: params.input,
		});
	}

	@OnLeaderTakeover()
	startAllGateways(): void {
		this.gateway.startAll();
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async stopAllGateways(): Promise<void> {
		await this.gateway.pauseAll();
	}

	/**
	 * The adapter hands us `message.content` verbatim, so a channel mention
	 * arrives as `<@applicationId> what's the status?`. Discord sets
	 * `botUserId` to the application ID, which is the same snowflake the
	 * mention encodes.
	 */
	getPlatformAgentContext(chat: ChatInstance): PlatformAgentContext {
		const adapter = chat.getAdapter(this.type);
		if (!isRecord(adapter)) return {};
		const agentUserId = adapter.botUserId;
		return typeof agentUserId === 'string' && agentUserId ? { agentUserId } : {};
	}

	prepareInboundText(text: string, context: PlatformAgentContext): string {
		const trimmed = text.trim();
		if (!context.agentUserId) return trimmed;
		return stripDiscordSelfMention(trimmed, context.agentUserId);
	}

	async createBridgeExecutionContext(
		params: BridgeMessageContextParams,
	): Promise<BridgeExecutionContext> {
		return {
			platformAgentContext: this.getPlatformAgentContext(params.chat),
			statusHandle: this.startTyping(params.thread, params.logger, params.agentId),
		};
	}

	async createResumeExecutionContext(params: {
		thread: BridgeMessageContextParams['thread'];
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
	}): Promise<BridgeResumeExecutionContext> {
		return {
			statusHandle: this.startTyping(params.thread, params.logger, params.agentId),
		};
	}

	private startTyping(
		thread: BridgeMessageContextParams['thread'],
		logger: BridgeMessageContextParams['logger'],
		agentId: string,
	) {
		return startTypingIndicator(thread, {
			logger,
			agentId,
			platform: 'Discord',
			refreshMs: DISCORD_TYPING_REFRESH_MS,
		});
	}

	formatApprovalDecisionMessage({ approved, raw, user }: ApprovalDecisionMessageParams): string {
		const responder = user.fullName || user.userName || user.userId;
		const outcome = approved ? `✅ Approved by ${responder}` : `🚫 Declined by ${responder}`;
		const originalText = this.extractCardText(raw);
		return originalText ? `${originalText}\n\n${outcome}` : outcome;
	}

	normalizeComponents(components: SuspendComponent[]): SuspendComponent[] {
		const normalized: SuspendComponent[] = [];
		for (const c of components) {
			switch (c.type) {
				case 'select':
				case 'radio_select':
					// Discord embeds have no select menu, so offer each option as a button.
					for (const opt of c.options ?? []) {
						normalized.push({ type: 'button', label: opt.label, value: opt.value });
					}
					break;
				default:
					normalized.push(c);
			}
		}
		return normalized;
	}

	private sessionKey(ctx: AgentChatIntegrationContext): string {
		return `${ctx.agentId}:${ctx.credentialId}`;
	}

	// ---------------------------------------------------------------------------
	// Credential extraction
	// ---------------------------------------------------------------------------

	private extractBotToken(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'botToken',
			'The Discord credential is missing a Bot Token. Copy it from the Bot section of the Discord Developer Portal.',
		);
	}

	/**
	 * Validated by us rather than left to the adapter: its own error tells the
	 * user to set `DISCORD_PUBLIC_KEY`, which is misleading advice inside n8n.
	 * Runs during `createAdapter`, so a credential predating the agent-channel
	 * fields fails the connect before the agent is published.
	 */
	private extractPublicKey(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'publicKey',
			'The Discord credential is missing a Public Key. Copy it from the application General Information page in the Discord Developer Portal.',
		);
	}

	private extractApplicationId(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'applicationId',
			'The Discord credential is missing an Application ID. Copy it from the application General Information page in the Discord Developer Portal.',
		);
	}

	private requireCredentialField(
		credential: Record<string, unknown>,
		field: string,
		message: string,
	): string {
		const value = credential[field];
		if (typeof value === 'string' && value.trim()) return value.trim();
		throw new Error(message);
	}

	/**
	 * Approval cards render as embeds, so the original copy is usually the first
	 * embed's description rather than the message content.
	 */
	private extractCardText(raw: unknown): string {
		if (!isRecord(raw) || !isRecord(raw.message)) return '';

		const { content, embeds } = raw.message;
		if (typeof content === 'string' && content) return content;

		if (Array.isArray(embeds)) {
			const [firstEmbed] = embeds;
			if (isRecord(firstEmbed) && typeof firstEmbed.description === 'string') {
				return firstEmbed.description;
			}
		}

		return '';
	}
}

/**
 * Drop the agent's own mention so the model sees "what's the status?" rather
 * than "<@1234567890> what's the status?". Discord encodes a user mention as
 * `<@id>`, or `<@!id>` in the legacy nickname form. Role mentions (`<@&id>`)
 * are left alone — they are somebody else's mention, not ours.
 */
function stripDiscordSelfMention(text: string, userId: string): string {
	return text
		.replace(new RegExp(`(^|\\s)<@!?${escapeRegExp(userId)}>`, 'g'), '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Application IDs come from a user-editable credential field, so never trust them as a pattern. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
