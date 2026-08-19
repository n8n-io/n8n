import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { type HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { Logger as ChatLogger, Message, Thread } from 'chat';
import { InstanceSettings } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
	type BridgeExecutionContext,
	type BridgeMessageContextParams,
	type BridgeResumeExecutionContext,
	type PlatformAgentContext,
	type PlatformContextQueryParams,
	type SettleActionMessageParams,
	type WebhookRequestContext,
	type WebhookRequestResolution,
} from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';
import type { SuspendComponent } from '../component-mapper';
import { assertCredentialNotClaimed } from '../credential-claim';
import { loadDiscordAdapter } from '../esm-loader';
import type { ReplyExpectation } from '../integration-tools';
import {
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from '../integration-tool-definitions';
import {
	DiscordGateway,
	type DiscordConnection,
	type DiscordGatewayAdapter,
} from './discord-gateway';
import {
	executeDiscordContextQuery,
	fetchDiscordApplicationMetadata,
	settleDiscordActionMessage,
} from './discord-operations';
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
			'Edit existing messages and add emoji reactions in the current Discord conversation.',
			'Render Discord embeds with buttons.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Discord or act as a Discord bot.',
			'The agent needs to reply to Discord users in the same conversation context.',
			'The agent needs to update or react to a Discord message in the current conversation.',
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
		'add_reaction',
		'do_not_respond',
	]);

	readonly contextToolDefinitions = resolveIntegrationContextQueryDefinitions([
		'get_current_message_context',
		'get_current_subject',
		'search_channels',
	]);

	readonly contextToolGuidance = [
		'Use search_channels to turn a channel name such as "general" into a channel ID. The same name can appear in more than one server — guildName tells them apart. When the result includes nextCursor, pass it back to continue searching the bot’s remaining servers.',
	];

	readonly actionToolGuidance = [
		'For edit_message, pass the messageId returned by a previous Discord action or get_current_message_context. The current Discord conversation is selected automatically.',
		'For send_channel_message, channelId must be shaped "discord:<guildId>:<channelId>" — pass the value returned by search_channels or get_current_message_context. A bare Discord channel ID copied from the Discord app is rejected.',
		'A Discord mention is answered inside a thread created off that message. Use send_channel_message when the reply belongs in the channel itself rather than that thread.',
	];

	readonly needsShortCallbackData = true;

	readonly disableStreaming = true;

	/**
	 * Discord acknowledges a button click with `DeferredUpdateMessage`, which
	 * promises Discord an edit of the source message. Deleting it instead would
	 * break that contract, so the action card is settled in place.
	 */
	readonly deleteActionMessageBeforeResume = false;

	resolveWebhookRequest(request: WebhookRequestContext): WebhookRequestResolution {
		// n8n does not enable the adapter's HTTP Gateway forwarding mode.
		if (request.headers['x-discord-gateway-token'] !== undefined) {
			return { type: 'reject', response: { status: 404, body: { error: 'Not found' } } };
		}

		// application_id is only an untrusted selector; the selected adapter still
		// verifies the request signature with that connection's public key.
		if (!isRecord(request.body) || typeof request.body.application_id !== 'string') {
			return { type: 'no_match' };
		}

		return { type: 'select', connectionSelector: request.body.application_id };
	}

	matchesWebhookConnection(
		credential: Record<string, unknown>,
		connectionSelector: string,
	): boolean {
		const applicationId = credential.applicationId;
		return typeof applicationId === 'string' && applicationId.trim() === connectionSelector;
	}

	/**
	 * Connections built by {@link createAdapter}, awaiting the `onConnected` hook
	 * that runs once the Chat instance has been initialized. Keyed by
	 * `agentId:credentialId`.
	 */
	private readonly pendingConnections = new Map<
		string,
		Omit<DiscordConnection, 'ingressEnabled'>
	>();

	private readonly gateway: DiscordGateway;

	private readonly httpClient: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		instanceSettings: InstanceSettings,
		private readonly agentRepository: AgentRepository,
		outboundHttp: OutboundHttp,
	) {
		super();
		this.gateway = new DiscordGateway(logger, instanceSettings);
		this.httpClient = outboundHttp.requests({
			ssrf: 'disabled', // the Discord API host is fixed and public
		});
	}

	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	/**
	 * Reject connect when another agent already owns this credential, then
	 * verify the bot token against Discord application metadata so a typo'd
	 * Application ID / Public Key fails before publish rather than at runtime.
	 *
	 * The token check stays out of `assertStartupPreconditions` on purpose: it
	 * calls Discord, so an outage there would otherwise block publishing an
	 * agent whose credential is perfectly fine.
	 */
	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);

		await this.validateDiscordCredential(ctx);
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const botToken = this.extractBotToken(ctx.credential);
		const publicKey = this.extractPublicKey(ctx.credential);
		const applicationId = this.extractApplicationId(ctx.credential);

		const { createDiscordAdapter } = await loadDiscordAdapter();

		// After the ESM load: reject a second in-process claim of this bot token
		// immediately before we register the pending adapter. Same session key
		// (reconnect) is allowed; a different agent/credential is not.
		this.assertBotTokenAvailable(this.sessionKey(ctx), botToken);

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
			logger: this.createAdapterLogger(),
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
		this.gateway.register(key, {
			...connection,
			ingressEnabled: ctx.ingressEnabled,
		});
	}

	async onDisconnected(ctx: AgentChatIntegrationContext): Promise<void> {
		const key = this.sessionKey(ctx);
		this.pendingConnections.delete(key);
		await this.gateway.discard(key);
	}

	async settleActionMessage(params: SettleActionMessageParams): Promise<void> {
		const botToken = this.gateway.botTokenFor(
			`${params.agentId}:${params.integration.credentialId}`,
		);
		if (!botToken) {
			throw new Error('Discord connection is not available to settle the action card');
		}

		await settleDiscordActionMessage({
			httpClient: this.httpClient,
			apiUrl: DISCORD_API_URL,
			botToken,
			threadId: params.threadId,
			messageId: params.messageId,
			content: params.content,
		});
	}

	/**
	 * Subscribe follow-ups only when the mention landed in a DM or a real
	 * Discord thread. After a failed auto-thread create the adapter emits the
	 * parent channel ID — subscribing that would make every later channel
	 * message trigger the agent.
	 */
	shouldSubscribeToNewMention({ thread }: { thread: Thread; message: Message }): boolean {
		const parts = thread.id.split(':');
		if (parts[0] !== 'discord' || parts.length < 3) return true;
		if (parts[1] === '@me') return true;
		return Boolean(parts[3]);
	}

	getReplyExpectation(params: {
		message: BridgeMessageContextParams['message'];
		isNewMention: boolean;
	}): ReplyExpectation {
		if (params.isNewMention || params.message.isMention === true) return 'required';

		const parts = params.message.threadId.split(':');
		const isGuildThread =
			parts[0] === 'discord' && Boolean(parts[1] && parts[1] !== '@me' && parts[2] && parts[3]);
		return isGuildThread ? 'optional' : 'required';
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		const { agentId, integration } = params.descriptor;
		const botToken = this.gateway.botTokenFor(`${agentId}:${integration.credentialId}`);

		return await executeDiscordContextQuery({
			httpClient: this.httpClient,
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
			statusHandle:
				params.replyExpectation === 'optional'
					? undefined
					: this.startTyping(params.thread, params.logger, params.agentId),
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

	formatActionDecisionMessage({
		approved,
		selectedLabel,
		raw,
		user,
	}: ActionDecisionMessageParams): string {
		const responder = user.fullName || user.userName || user.userId;
		const outcome =
			approved === undefined
				? `✅ ${selectedLabel || 'Action'} selected by ${responder}`
				: approved
					? `✅ Approved by ${responder}`
					: `🚫 Declined by ${responder}`;
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

	private assertBotTokenAvailable(sessionKey: string, botToken: string): void {
		for (const [key, connection] of this.pendingConnections) {
			if (key === sessionKey) continue;
			if (connection.botToken === botToken) {
				throw new ConflictError(
					'This Discord bot token is already connected to another agent on this instance',
				);
			}
		}

		if (this.gateway.sessionKeyUsingBotToken(botToken, sessionKey)) {
			throw new ConflictError(
				'This Discord bot token is already connected to another agent on this instance',
			);
		}
	}

	private async validateDiscordCredential(ctx: AgentChatIntegrationContext): Promise<void> {
		const botToken = this.extractBotToken(ctx.credential);
		const publicKey = this.extractPublicKey(ctx.credential);
		const applicationId = this.extractApplicationId(ctx.credential);

		const result = await fetchDiscordApplicationMetadata({
			httpClient: this.httpClient,
			apiUrl: DISCORD_API_URL,
			botToken,
		});

		if (!result.ok) {
			if (result.kind === 'http' && (result.status === 401 || result.status === 403)) {
				throw new BadRequestError(
					'The Discord Bot Token was rejected. Check that the token is correct and has not been regenerated.',
				);
			}
			throw new BadRequestError(
				'Discord did not return application metadata for this bot token. Verify the Application ID, Public Key, and Bot Token belong to the same Discord application.',
			);
		}

		if (result.application.id !== applicationId) {
			throw new BadRequestError(
				'The Discord Application ID does not match this bot token. Copy the Application ID from the same Discord application that issued the token.',
			);
		}

		if (result.application.verify_key.toLowerCase() !== publicKey.toLowerCase()) {
			throw new BadRequestError(
				'The Discord Public Key does not match this bot token. Copy the Public Key from the same Discord application that issued the token.',
			);
		}
	}

	/**
	 * Adapter-compatible logger that forwards only the message string into n8n.
	 * Pinned adapter 4.28.1 attaches message text, IDs, signatures, and public
	 * keys as metadata arguments — never forward those.
	 */
	private createAdapterLogger(): ChatLogger {
		const forward =
			(level: 'debug' | 'info' | 'warn' | 'error') =>
			(message: string, ..._args: unknown[]) => {
				this.logger[level](`[DiscordAdapter] ${message}`);
			};
		const logger: ChatLogger = {
			child: () => logger,
			debug: forward('debug'),
			info: forward('info'),
			warn: forward('warn'),
			error: forward('error'),
		};
		return logger;
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
