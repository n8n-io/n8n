import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import type {
	AdapterPostableMessage,
	ChatInstance,
	Logger as ChatLogger,
	RawMessage,
	StreamChunk,
	StreamOptions,
} from 'chat';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, UserError } from 'n8n-workflow';

import type { AdapterError } from '@chat-adapter/shared';
import type { WhatsAppRawMessage } from '@chat-adapter/whatsapp';

import { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
} from '../agent-chat-integration';
import { componentTextToString, type SuspendComponent } from '../component-mapper';
import { assertCredentialNotClaimed } from '../credential-claim';
import { loadChatAdapterShared, loadChatSdk, loadWhatsAppAdapter } from '../esm-loader';
import { deriveWhatsAppVerifyToken } from '../integration-helpers';
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
 * Meta's Cloud API error codes that mean "you're sending too fast," not "this
 * message is invalid." A business's WhatsApp "quality rating" (see module
 * doc) lowers the daily/throughput cap that trips these; they're expected to
 * clear on their own after a short wait, so panic-retrying immediately would
 * only add to the same behaviour Meta is penalising.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const WHATSAPP_RATE_LIMIT_ERROR_CODES = new Set([130429, 131056, 80007]);

const WHATSAPP_RATE_LIMIT_MAX_ATTEMPTS = 4;
const WHATSAPP_RATE_LIMIT_BACKOFF_BASE_MS = 1_000;
const WHATSAPP_RATE_LIMIT_BACKOFF_CAP_MS = 8_000;

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
 * - Meta rate-limits a number whose "quality rating" has dropped (see
 *   {@link WHATSAPP_RATE_LIMIT_ERROR_CODES}); the same wrapper retries those
 *   sends with backoff instead of surfacing them immediately, since retrying
 *   fast makes the underlying rating problem worse, not better.
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

		const [{ WhatsAppAdapter: AdapterClass }, sdk, chatAdapterShared] = await Promise.all([
			loadWhatsAppAdapter(),
			loadChatSdk(),
			loadChatAdapterShared(),
		]);
		const logger = this.logger;
		const { AdapterError } = chatAdapterShared;

		// Wraps the real adapter to enforce the 24-hour customer service window
		// and the rate-limit backoff (see module doc). Every outbound send
		// (respond, send_dm, …) ultimately calls one of these two methods, so
		// this is the one place that catches them all without touching the
		// shared cross-platform action executor.
		class ConversationWindowGuardedAdapter extends AdapterClass {
			override async postMessage(
				threadId: string,
				message: AdapterPostableMessage,
			): Promise<RawMessage<WhatsAppRawMessage>> {
				await assertCustomerServiceWindowOpen(this.chat, sdk, threadId, logger);
				return await withWhatsAppRateLimitBackoff(
					async () => await super.postMessage(threadId, message),
					AdapterError,
					logger,
				);
			}

			override async stream(
				threadId: string,
				textStream: AsyncIterable<string | StreamChunk>,
				options?: StreamOptions,
			): Promise<RawMessage<WhatsAppRawMessage>> {
				await assertCustomerServiceWindowOpen(this.chat, sdk, threadId, logger);
				return await withWhatsAppRateLimitBackoff(
					async () => await super.stream(threadId, textStream, options),
					AdapterError,
					logger,
				);
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
 * `@chat-adapter/whatsapp` is exact-pinned (see pnpm-workspace.yaml) to a
 * version whose `graphApiRequest` throws a plain `AdapterError` with Meta's
 * error body folded into `message` as text (`WhatsApp API error: <status>
 * <body>`), not as typed fields. A later version exports a structured
 * `WhatsAppApiError` with `errorCode`/`status` instead, but bumping this
 * catalog entry also bumps chat/slack/telegram/discord/linear in lockstep —
 * three of those four were found to change real, unrelated behaviour, so
 * that upgrade is out of scope for a WhatsApp-only fix. Parsing the message
 * is the only way to read Meta's error code without it; revisit this once
 * the catalog does move.
 */
const WHATSAPP_API_ERROR_MESSAGE = /^WhatsApp API error: (\d+) (.*)$/s;

interface WhatsAppApiErrorDetails {
	status?: number;
	code?: number;
}

function parseWhatsAppApiError(message: string): WhatsAppApiErrorDetails | undefined {
	const match = WHATSAPP_API_ERROR_MESSAGE.exec(message);
	if (!match) return undefined;
	const status = Number(match[1]);
	try {
		const body: unknown = JSON.parse(match[2]);
		const code =
			isRecord(body) && isRecord(body.error) && typeof body.error.code === 'number'
				? body.error.code
				: undefined;
		return { status, code };
	} catch {
		return { status };
	}
}

/**
 * True for a transient "you're sending too fast" failure (see
 * {@link WHATSAPP_RATE_LIMIT_ERROR_CODES}), false for anything else —
 * including a template rejected for negative feedback (code 131051), which
 * is a real content problem, not a rate limit, and must not be retried.
 */
function isWhatsAppRateLimitError(error: unknown, AdapterErrorClass: typeof AdapterError): boolean {
	if (!(error instanceof AdapterErrorClass)) return false;
	const details = parseWhatsAppApiError(error.message);
	if (!details) return false;
	return (
		details.status === 429 ||
		(details.code !== undefined && WHATSAPP_RATE_LIMIT_ERROR_CODES.has(details.code))
	);
}

/**
 * Duck-typed to satisfy `httpStatusFromError` from `@n8n/backend-network`,
 * which `caughtIntegrationError` (see `channel-rate-limit.ts`) checks before
 * recording a cooldown on `ChannelRateLimitGuard`. Every other channel's
 * adapter already throws something shaped like this for a 429; WhatsApp's
 * `AdapterError` doesn't (see {@link WHATSAPP_API_ERROR_MESSAGE}), so without
 * this, an exhausted WhatsApp rate limit would silently skip that shared
 * cross-turn cooldown and fall through to a generic failure instead.
 */
interface HttpStatusCarryingError {
	response: { status: number };
}

/**
 * Retries a send after one of Meta's transient rate-limit errors, waiting
 * longer each time instead of retrying immediately — see module doc for why
 * hammering a rate-limited number is exactly the behaviour that got it
 * rate-limited. Any other error, or the last attempt, is rethrown as-is.
 *
 * A rate limit that never clears within these attempts surfaces as an
 * `OperationalError` shaped so the shared `ChannelRateLimitGuard` (see
 * `channel-rate-limit.ts`) recognises it as a 429 and starts its own
 * cross-turn cooldown for this connection — the same "stop hammering it and
 * fail gracefully" behaviour every other channel already gets, layered on
 * top of the short local backoff above for the common, momentary case.
 */
async function withWhatsAppRateLimitBackoff<T>(
	send: () => Promise<T>,
	AdapterErrorClass: typeof AdapterError,
	logger: Logger,
): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await send();
		} catch (error) {
			if (!isWhatsAppRateLimitError(error, AdapterErrorClass)) throw error;
			if (attempt >= WHATSAPP_RATE_LIMIT_MAX_ATTEMPTS) {
				throw Object.assign(
					new OperationalError(
						'WhatsApp is rate-limiting messages to this number, likely because of its Meta ' +
							'quality rating or daily messaging limit. Wait before sending more messages.',
						{ cause: error },
					),
					{ response: { status: 429 } } satisfies HttpStatusCarryingError,
				);
			}
			const delayMs = Math.min(
				WHATSAPP_RATE_LIMIT_BACKOFF_BASE_MS * 2 ** (attempt - 1),
				WHATSAPP_RATE_LIMIT_BACKOFF_CAP_MS,
			);
			logger.warn('[WhatsAppIntegration] Rate limited by WhatsApp, backing off before retrying', {
				attempt,
				delayMs,
			});
			await sleep(delayMs);
		}
	}
}

/**
 * Reads the same persistent per-thread history cache the SDK backfills
 * `thread.allMessages` from for adapters that set `persistThreadHistory`
 * (WhatsApp has no server-side history API of its own). `ChatInstance` — the
 * adapter-facing interface, not the consumer-facing `Chat` class — exposes no
 * thread/message accessors, so this reads the cache directly off its state
 * adapter instead.
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
