import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	AdapterPostableMessage,
	ChatInstance,
	Logger as ChatLogger,
	RawMessage,
	StreamChunk,
	StreamOptions,
} from 'chat';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import type { WhatsAppRawMessage } from '@chat-adapter/whatsapp';

import { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
	type UnauthenticatedWebhookContext,
	type UnauthenticatedWebhookResponse,
} from '../agent-chat-integration';
import { componentTextToString, type SuspendComponent } from '../component-mapper';
import { assertCredentialNotClaimed } from '../credential-claim';
import { loadChatSdk, loadWhatsAppAdapter } from '../esm-loader';
import { deriveWhatsAppVerifyToken, stringValue } from '../integration-helpers';
import { resolveIntegrationActionDefinitions } from '../integration-tool-definitions';

type ChatSdk = Awaited<ReturnType<typeof loadChatSdk>>;

/**
 * WhatsApp only accepts free-form (non-template) replies within 24 hours of
 * the customer's last inbound message. Outside that window the Cloud API
 * rejects the send; template messages are the documented workaround but are
 * explicitly out of scope here, so we fail fast instead.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
const WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * First-pass default for when WhatsApp starts a fresh agent session on its
 * own, since it has no "/new" slash-command equivalent that reaches the
 * bridge (see `RESET_SESSION_COMMAND` in agent-chat-bridge.ts). 30 minutes is
 * a reasonable guess, not a validated product decision — revisit once there's
 * usage data or explicit product input.
 */
const WHATSAPP_DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES = 30;

/** WhatsApp Cloud API's own limit on interactive reply buttons per message. */
const WHATSAPP_MAX_REPLY_BUTTONS = 3;

const WHATSAPP_BOT_USER_NAME = 'n8n-agent';

/**
 * WhatsApp platform integration.
 *
 * Every WhatsApp conversation is an unthreaded 1:1 DM between the business
 * phone number and a customer (no group messaging in this version). Two
 * platform constraints shape this integration beyond the usual credential +
 * adapter wiring:
 *
 * - The 24-hour customer service window (see {@link WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS}):
 *   enforced by wrapping the adapter (see {@link createAdapter}) rather than
 *   in the shared action executor, because that's the one choke point every
 *   outbound send (respond, send_dm, …) actually passes through.
 * - Reply buttons cap at 3 (see {@link normalizeComponents}); WhatsApp lists
 *   (`select`/`radio_select`) are natively supported by the adapter's own
 *   Card conversion, so unlike Telegram/Discord they need no flattening here.
 *
 * `disableStreaming` mirrors Telegram/Discord: the adapter only supports
 * buffered sends (accumulate-then-post), never incremental edits.
 */
@Service()
export class WhatsAppIntegration extends AgentChatIntegration {
	readonly type = 'whatsapp';

	readonly credentialTypes = ['whatsAppBotApi'];

	readonly displayLabel = 'WhatsApp';

	readonly displayIcon = 'whatsapp';

	/**
	 * Hidden from the public catalog and the add-trigger UI until the
	 * follow-on work (rate limiting, media handling, setup UX) lands —
	 * without it this channel would go live with only the bare MVP.
	 */
	readonly internal = true;

	readonly builderGuidance = {
		capabilities: [
			'Receive WhatsApp messages as agent triggers.',
			'Respond in the current WhatsApp conversation and send direct WhatsApp messages.',
			'Add or remove emoji reactions on a WhatsApp message.',
			'Render WhatsApp-compatible cards with reply buttons or list messages.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from WhatsApp or act as a WhatsApp Business bot.',
			'The agent needs to reply to a WhatsApp customer in the same 1:1 conversation.',
			'A scheduled Agent task should proactively message a known WhatsApp customer, within the 24-hour customer service window.',
		],
		useNodeToolWhen: [
			'WhatsApp is only a backend API step and the agent does not need to be connected as a WhatsApp chat surface.',
			'The WhatsApp operation is performed by a non-Agent workflow, or the exact operation is not listed in the Agent integration capabilities.',
			'The message must reach a customer outside the 24-hour window — that requires a pre-approved template message, which this integration does not send.',
		],
	};

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'select',
		'radio_select',
		'divider',
		'fields',
	];

	readonly actionToolDefinitions = resolveIntegrationActionDefinitions([
		'respond',
		'send_dm',
		'add_reaction',
	]);

	readonly actionToolGuidance = [
		'For scheduled tasks without an inbound conversation, use send_dm with the known WhatsApp user ID (the customer phone number, WhatsApp "wa_id" format). This still fails outside the 24-hour customer service window.',
		'WhatsApp has no group conversations — every thread is a 1:1 DM.',
	];

	readonly disableStreaming = true;

	/**
	 * WhatsApp supports neither editing nor deleting a sent message (Cloud API
	 * limitation), so there is nothing useful to delete before resuming — the
	 * action card is simply left as-is in the conversation.
	 */
	readonly deleteActionMessageBeforeResume = false;

	readonly defaultSessionIdleTimeoutMinutes = WHATSAPP_DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES;

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly instanceSettings: InstanceSettings,
	) {
		super();
	}

	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);
	}

	/**
	 * Answer Meta's webhook verification handshake (`hub.mode` / `hub.verify_token`
	 * / `hub.challenge`) before a credential is connected. The verify token is
	 * derivable from the agent ID alone (see `deriveVerifyToken`), so unlike a
	 * live conversation there is nothing here that needs a credential — the same
	 * reasoning Slack's `url_verification` handling already relies on.
	 *
	 * Once a credential *is* connected, the real adapter answers this handshake
	 * itself (its own `handleWebhook` branches on `request.method === 'GET'`), so
	 * this only ever fires for the pre-connection case.
	 */
	handleUnauthenticatedWebhook(
		context: UnauthenticatedWebhookContext,
	): UnauthenticatedWebhookResponse | undefined {
		if (context.method !== 'GET') return undefined;

		const mode = stringValue(context.query['hub.mode']);
		const token = stringValue(context.query['hub.verify_token']);
		const challenge = stringValue(context.query['hub.challenge']);
		if (mode !== 'subscribe' || !token || !challenge) return undefined;

		if (token !== this.deriveVerifyToken(context.agentId)) {
			return { status: 403, body: 'Forbidden', raw: true };
		}
		return { status: 200, body: challenge, raw: true };
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const config = {
			accessToken: this.extractAccessToken(ctx.credential),
			appSecret: this.extractAppSecret(ctx.credential),
			phoneNumberId: this.extractPhoneNumberId(ctx.credential),
			verifyToken: this.deriveVerifyToken(ctx.agentId),
			userName: WHATSAPP_BOT_USER_NAME,
			logger: this.createAdapterLogger(),
		};
		// WABA ID isn't needed by the adapter for messaging — it's stored on the
		// credential for future template-management use — but validate it here
		// so a credential missing it fails at connect time, same as the fields
		// the adapter does need.
		this.extractBusinessAccountId(ctx.credential);

		const [{ WhatsAppAdapter: AdapterClass }, sdk] = await Promise.all([
			loadWhatsAppAdapter(),
			loadChatSdk(),
		]);
		const logger = this.logger;

		// Wraps the real adapter to enforce the 24-hour customer service window
		// (see module doc). Every outbound send (respond, send_dm, …) ultimately
		// calls one of these two methods, so this is the one place that catches
		// them all without touching the shared cross-platform action executor.
		class ConversationWindowGuardedAdapter extends AdapterClass {
			override async postMessage(
				threadId: string,
				message: AdapterPostableMessage,
			): Promise<RawMessage<WhatsAppRawMessage>> {
				await assertCustomerServiceWindowOpen(this.chat, sdk, threadId, logger);
				return await super.postMessage(threadId, message);
			}

			override async stream(
				threadId: string,
				textStream: AsyncIterable<string | StreamChunk>,
				options?: StreamOptions,
			): Promise<RawMessage<WhatsAppRawMessage>> {
				await assertCustomerServiceWindowOpen(this.chat, sdk, threadId, logger);
				return await super.stream(threadId, textStream, options);
			}
		}

		return new ConversationWindowGuardedAdapter(config);
	}

	formatActionDecisionMessage({
		approved,
		selectedLabel,
		user,
	}: ActionDecisionMessageParams): string {
		const responder = user.fullName || user.userName || user.userId;
		return approved === undefined
			? `✅ ${selectedLabel || 'Action'} selected by ${responder}`
			: approved
				? `✅ Approved by ${responder}`
				: `🚫 Declined by ${responder}`;
	}

	/**
	 * WhatsApp lists (`select`/`radio_select`) are natively supported by the
	 * adapter's own Card-to-interactive-message conversion, so they pass
	 * through unchanged. Only reply buttons need handling here: the Cloud API
	 * caps interactive messages at 3 buttons and otherwise rejects the send.
	 */
	normalizeComponents(components: SuspendComponent[]): SuspendComponent[] {
		const buttons = components.filter((c) => c.type === 'button');
		if (buttons.length <= WHATSAPP_MAX_REPLY_BUTTONS) return components;

		// More than 3 options don't fit WhatsApp's reply-button limit, but
		// WhatsApp list messages allow far more entries — convert the overflow
		// into a `select` so the action stays completable from WhatsApp, instead
		// of dropping the options behind unreachable text.
		const normalized = components.filter((c) => c.type !== 'button');
		normalized.push({
			type: 'select',
			label: 'Choose an option',
			options: buttons.map((b) => ({
				label: b.label ?? componentTextToString(b.text) ?? b.value ?? '',
				value: b.value ?? b.label ?? '',
			})),
		});
		return normalized;
	}

	private createAdapterLogger(): ChatLogger {
		const forward =
			(level: 'debug' | 'info' | 'warn' | 'error') =>
			(message: string, ..._args: unknown[]) => {
				this.logger[level](`[WhatsAppAdapter] ${message}`);
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

	private extractAccessToken(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'accessToken',
			'The WhatsApp credential is missing an Access Token. Copy it from the WhatsApp > API Setup page of the Meta app.',
		);
	}

	private extractPhoneNumberId(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'phoneNumberId',
			'The WhatsApp credential is missing a Phone Number ID. Copy it from the WhatsApp > API Setup page of the Meta app.',
		);
	}

	private extractBusinessAccountId(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'businessAccountId',
			'The WhatsApp credential is missing a WhatsApp Business Account ID.',
		);
	}

	private extractAppSecret(credential: Record<string, unknown>): string {
		return this.requireCredentialField(
			credential,
			'appSecret',
			'The WhatsApp credential is missing an App Secret. Copy it from App Settings > Basic in the Meta app.',
		);
	}

	private deriveVerifyToken(agentId: string): string {
		return deriveWhatsAppVerifyToken(this.instanceSettings.encryptionKey, agentId);
	}

	private requireCredentialField(
		credential: Record<string, unknown>,
		field: string,
		message: string,
	): string {
		const value = credential[field];
		if (typeof value === 'string' && value.trim()) return value.trim();
		throw new UserError(message);
	}
}

/**
 * Reject a send once more than 24 hours have passed since the customer's
 * last inbound message. `chat` is `null` before the adapter's `initialize()`
 * runs — nothing sends through it yet at that point, so this is a no-op then.
 */
async function assertCustomerServiceWindowOpen(
	chat: ChatInstance | null,
	sdk: ChatSdk,
	threadId: string,
	logger: Logger,
): Promise<void> {
	const lastInboundAt = await lastInboundMessageAt(chat, sdk, threadId, logger);
	// No cached inbound history: either the very first message in this
	// conversation, or the cache expired. Let the Cloud API be the authority
	// on a cold-start send rather than blocking on an absence we can't verify.
	if (!lastInboundAt) return;

	if (Date.now() - lastInboundAt.getTime() > WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS) {
		throw new UserError(
			"WhatsApp only allows free-form replies within 24 hours of the customer's last message. " +
				'That window has closed for this conversation, so this message cannot be sent. ' +
				'Template messages for re-engaging customers outside the window are not supported.',
		);
	}
}

/**
 * Reads the same per-thread history cache the SDK backfills `thread.allMessages`
 * from for adapters that set `persistThreadHistory` (WhatsApp has no
 * server-side history API of its own). `ChatInstance` — the adapter-facing
 * interface, not the consumer-facing `Chat` class — exposes no thread/message
 * accessors, so this reads the cache directly off its state adapter instead.
 *
 * That state is the in-memory adapter `chat-integration.service.ts` builds
 * each connection on (`createMemoryState()`) — it does not survive a process
 * restart or move between mains. A cold cache after a restart means this
 * returns `undefined`, and {@link assertCustomerServiceWindowOpen} already
 * treats that the same as a genuinely fresh conversation: it lets the Cloud
 * API be the authority on whether the 24-hour window is actually open,
 * instead of blocking on an absence this can't verify.
 */
async function lastInboundMessageAt(
	chat: ChatInstance | null,
	sdk: ChatSdk,
	threadId: string,
	logger: Logger,
): Promise<Date | undefined> {
	if (!chat) return undefined;
	try {
		const history = new sdk.ThreadHistoryCache(chat.getState());
		const messages = await history.getMessages(threadId);
		let lastInboundAt: Date | undefined;
		for (const message of messages) {
			if (message.author.isMe) continue;
			lastInboundAt = message.metadata.dateSent;
		}
		return lastInboundAt;
	} catch (error) {
		logger.warn('[WhatsAppIntegration] Failed to read thread history for the 24h window check', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}
