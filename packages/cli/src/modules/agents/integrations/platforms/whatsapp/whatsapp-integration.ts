import {
	resolveWhatsAppSettings,
	type AgentIntegrationConfig,
	type AgentIntegrationDisconnectWarning,
	type RichCardComponentType,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import type {
	ActionEvent,
	AdapterPostableMessage,
	ChatInstance,
	Logger as ChatLogger,
	Message,
	RawMessage,
} from 'chat';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, UserError } from 'n8n-workflow';
import { createHmac } from 'node:crypto';

import type { WhatsAppRawMessage } from '@chat-adapter/whatsapp';

import { AgentRepository } from '../../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentIntegrationRemovalContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
	type PlatformActionParams,
	type PlatformContextQueryParams,
	type BridgeMessageContextParams,
	type BridgeResumeExecutionContext,
	type UnauthenticatedWebhookContext,
	type UnauthenticatedWebhookResponse,
} from '../../agent-chat-integration';
import {
	channelRateLimitMessage,
	type RecipientScopedRateLimitError,
} from '../../channel-rate-limit';
import { ChannelRateLimitGuard } from '../../channel-rate-limit.guard';
import {
	componentTextToString,
	type NormalizeComponentsContext,
	type SuspendComponent,
} from '../../component-mapper';
import { assertCredentialNotClaimed } from '../../credential-claim';
import { loadChatSdk, loadWhatsAppAdapter } from '../../esm-loader';
import {
	connectionUnavailable,
	deriveWhatsAppVerifyToken,
	stringProperty,
	stringValue,
	unsupportedQuery,
} from '../../integration-helpers';
import {
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from '../../integration-tool-definitions';
import { buildIntegrationConnectionId } from '../../integration-tool-factory';
import type { IntegrationActionResult, ReplyExpectation } from '../../integration-tool-types';
import { startTypingIndicator } from '../typing-indicator';
import {
	GRAPH_API_BASE_URL,
	WhatsAppCredentialCheckService,
} from './whatsapp-credential-check.service';
import {
	buildWhatsAppTemplateMessage,
	listWhatsAppTemplates,
	type FetchWhatsAppTemplates,
	type WhatsAppGraphResponse,
} from './whatsapp-templates';
import {
	listTemplatesQueryInputSchema,
	sendTemplateInputSchema,
	WHATSAPP_ACTION_TOOL_DEFINITIONS,
	WHATSAPP_CONTEXT_QUERY_TOOL_DEFINITIONS,
} from './whatsapp-tool-definitions';
import {
	DELIVERY_FAILURE_CHAT_NOTICE,
	DELIVERY_FAILURE_MESSAGE_ID_SUFFIX,
	DELIVERY_FAILURE_NOTICE,
	DeliveryFailureRecoveryLimiter,
	isDeliveryFailureNotice,
	isRecentFailure,
	parseWindowClosedFailures,
	WHATSAPP_REENGAGEMENT_ERROR_CODE,
} from './whatsapp-delivery-failures';
import {
	WHATSAPP_MAX_LIST_ROWS,
	WHATSAPP_MAX_PAGED_OPTIONS,
	WhatsAppOptionPagesStore,
	encodePageValue,
	getOptionPage,
	parsePageValue,
	type PagedOption,
} from './whatsapp-option-pages.store';
import { WhatsAppSetupTelemetryService } from './whatsapp-setup-telemetry.service';
import { WhatsAppWebhookVerificationStore } from './whatsapp-webhook-verification.store';
import { buildWhatsAppOriginDraft } from './whatsapp-origin';
import type { DecodedThread, OriginInput } from '../../integration-origin-support';

type ChatSdk = Awaited<ReturnType<typeof loadChatSdk>>;

/**
 * WhatsApp only accepts free-form (non-template) replies within 24 hours of
 * the customer's last inbound message. Outside that window the Cloud API
 * rejects the send, so we fail fast and point the agent to `send_template`.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
const WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

const WINDOW_CLOSED_MESSAGE =
	"WhatsApp only allows free-form messages within 24 hours of the customer's last message. " +
	'That window has closed for this conversation, so this message cannot be sent. ' +
	'To reach the customer, call list_templates, choose a template that fits, and send it with send_template. ' +
	'If no template fits, tell the user that the customer cannot be reached until they message again.';

/** At most this many recovery turns for each thread in this window. See {@link DeliveryFailureRecoveryLimiter}. */
const DELIVERY_FAILURE_RECOVERY_WINDOW_MS = 60 * 60 * 1000;
const DELIVERY_FAILURE_MAX_RECOVERIES = 3;

/** Listing templates runs inside an agent turn, so a stalled request has to give up. */
const WHATSAPP_TEMPLATE_REQUEST_TIMEOUT_MS = 30_000;

/**
 * First-pass default for when WhatsApp starts a fresh agent session on its
 * own, since it has no "/new" slash-command equivalent that reaches the
 * bridge (see `RESET_SESSION_COMMAND` in agent-chat-bridge.ts). 30 minutes is
 * a reasonable guess, not a validated product decision — revisit once there's
 * usage data or explicit product input.
 */
const WHATSAPP_DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES = 30;

/** Posted when the user taps "More…" after the stored options are gone. */
const OPTIONS_EXPIRED_NOTICE = 'These options are no longer available. Ask again to see the list.';

/** WhatsApp Cloud API's own limit on interactive reply buttons per message. */
const WHATSAPP_MAX_REPLY_BUTTONS = 3;

/**
 * WhatsApp's typing indicator ends after about 25 seconds or when a reply is
 * sent, whichever comes first, so refresh it inside that window.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/typing-indicators
 */
const WHATSAPP_TYPING_REFRESH_MS = 20 * 1000;

const WHATSAPP_BOT_USER_NAME = 'n8n-agent';

/** Where the user changes the callback URL of the Meta app that still points here. */
const META_APP_DASHBOARD_URL = 'https://developers.facebook.com/apps';

/** Removing a channel must not wait on Meta, so the number lookup gives up quickly. */
const REMOVAL_NUMBER_LOOKUP_TIMEOUT_MS = 3_000;

/**
 * Meta's Cloud API error codes that mean "you're sending too fast," not "this
 * message is invalid." A business's WhatsApp "quality rating" (see module
 * doc) lowers the daily/throughput cap that trips these; they're expected to
 * clear on their own after a short wait, so panic-retrying immediately would
 * only add to the same behaviour Meta is penalising.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const WHATSAPP_RATE_LIMIT_ERROR_CODES = new Set([130429, 131048, 131056, 80007]);

/**
 * Meta's per-recipient "pair" rate limit, not a limit on the number as a
 * whole — cooling down the whole connection for it would silence every other
 * customer because of one chatty conversation (see {@link withWhatsAppRateLimitBackoff}).
 */
const WHATSAPP_PAIR_RATE_LIMIT_CODE = 131056;

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
 *   enforced by wrapping the adapter's `postMessage` (see {@link createAdapter})
 *   rather than in the shared action executor, because that's the one choke
 *   point every outbound send (respond, send_dm, …) actually passes through.
 * - Meta rate-limits a number whose "quality rating" has dropped (see
 *   {@link WHATSAPP_RATE_LIMIT_ERROR_CODES}); `graphApiRequest` — not
 *   `postMessage` — is wrapped to retry those, since one `postMessage` call
 *   can make several requests and retrying the whole thing would resend
 *   whichever already went through. Every other request-making call
 *   (reactions, templates, …) shares `graphApiRequest`, so they retry too.
 * - Reply buttons cap at 3 (see {@link normalizeComponents}); WhatsApp lists
 *   (`select`/`radio_select`) are natively supported by the adapter's own
 *   Card conversion, so unlike Telegram/Discord they need no flattening here.
 * - Outside the 24-hour window, the agent chooses an approved template with
 *   `list_templates` and sends it with `send_template` (see `whatsapp-templates.ts`).
 *   Templates are managed in WhatsApp Manager. n8n only reads them.
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
			'Send an approved utility template message to reach a customer outside the 24-hour customer service window.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from WhatsApp or act as a WhatsApp Business bot.',
			'The agent needs to reply to a WhatsApp customer in the same 1:1 conversation.',
			'A scheduled Agent task should proactively message a known WhatsApp customer. Outside the 24-hour customer service window, it can only send an approved utility template.',
		],
		useNodeToolWhen: [
			'WhatsApp is only a backend API step and the agent does not need to be connected as a WhatsApp chat surface.',
			'The WhatsApp operation is performed by a non-Agent workflow, or the exact operation is not listed in the Agent integration capabilities.',
			'The message must reach a customer outside the 24-hour window with a marketing or authentication template. The agent can send only utility templates.',
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

	readonly contextToolDefinitions = [
		...resolveIntegrationContextQueryDefinitions([
			'get_current_message_context',
			'get_current_subject',
		]),
		...WHATSAPP_CONTEXT_QUERY_TOOL_DEFINITIONS,
	];

	readonly actionToolDefinitions = [
		...resolveIntegrationActionDefinitions(['respond', 'send_dm', 'add_reaction']),
		...WHATSAPP_ACTION_TOOL_DEFINITIONS,
	];

	readonly actionToolGuidance = [
		'For scheduled tasks without an inbound conversation, use send_dm with the known WhatsApp user ID (the customer phone number, WhatsApp "wa_id" format). This fails outside the 24-hour customer service window.',
		'When a send fails with an error that says the 24-hour window has closed, call list_templates, choose the template that best fits what you wanted to say, and send it with send_template. Use only facts you know as placeholder values. If no template fits, do not send one. For any other send error, do not send a template.',
		'A template does not open the 24-hour window. Free-form messages to the customer still fail until the customer replies. Send a template only when its content is the message you want the customer to receive. Never send one as a placeholder or to try to open the window.',
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
		private readonly channelRateLimitGuard: ChannelRateLimitGuard,
		private readonly webhookVerification: WhatsAppWebhookVerificationStore,
		private readonly outboundHttp: OutboundHttp,
		private readonly optionPages: WhatsAppOptionPagesStore,
		private readonly setupTelemetry: WhatsAppSetupTelemetryService,
	) {
		super();
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		if (params.query !== 'list_templates') return unsupportedQuery(this.type, params.query);
		const adapter = templateAdapter(params.chat);
		if (!adapter) return connectionUnavailable();

		const input = listTemplatesQueryInputSchema.parse(params.input);
		const result = await listWhatsAppTemplates(
			async (qs) => await adapter.fetchMessageTemplates(qs),
			input,
		);
		return { ok: true, ...result };
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		if (params.action !== 'send_template') return undefined;
		const adapter = templateAdapter(params.chat);
		if (!adapter) return connectionUnavailable();

		const input = sendTemplateInputSchema.parse(params.input);
		const message = await buildWhatsAppTemplateMessage(
			async (qs) => await adapter.fetchMessageTemplates(qs),
			input,
		);
		// Sent straight through the adapter, not `postMessage`: a template is the
		// one message type the customer service window allows.
		const threadId = await adapter.openDM(input.userId);
		const sent = await adapter.sendTemplate(threadId, message);
		return {
			ok: true,
			messageContext: {
				integrationConnectionId: params.descriptor.integrationConnectionId,
				platform: params.descriptor.integration.type,
				target: { type: 'dm', userId: input.userId, threadId },
				messageId: sent.id,
				updatedAt: new Date().toISOString(),
			},
		};
	}

	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);
	}

	/**
	 * A new setup of this agent can use a different Meta app. Without this, step
	 * 4 would confirm the handshake that the removed channel's app completed.
	 *
	 * Removing the channel does not change the callback URL in Meta. The number
	 * keeps sending messages here, and nothing answers them. The warning tells
	 * the user so.
	 */
	async onRemove(
		ctx: AgentIntegrationRemovalContext,
	): Promise<AgentIntegrationDisconnectWarning | undefined> {
		await this.webhookVerification.clear(ctx.agentId);
		// A draft entry has no credential, so no number was ever connected to this agent.
		if (!ctx.credentialId) return undefined;
		const displayPhoneNumber = await this.lookUpDisplayPhoneNumber(ctx);
		return {
			integrationType: this.type,
			code: 'number_still_connected',
			action: { type: 'open_url', url: META_APP_DASHBOARD_URL },
			...(displayPhoneNumber ? { details: { displayPhoneNumber } } : {}),
		};
	}

	/** The number as WhatsApp shows it. Best effort: the warning still works without it. */
	private async lookUpDisplayPhoneNumber(
		ctx: AgentIntegrationRemovalContext,
	): Promise<string | undefined> {
		try {
			const status = await Promise.race([
				Container.get(WhatsAppCredentialCheckService).getMetaStatus(
					ctx.user,
					ctx.projectId,
					ctx.credentialId,
				),
				sleep(REMOVAL_NUMBER_LOOKUP_TIMEOUT_MS).then(() => undefined),
			]);
			return status?.displayPhoneNumber;
		} catch (error) {
			this.logger.debug('[WhatsAppIntegration] Could not read the number for the removal warning', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
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
		// Recorded so the setup can confirm the step. Not awaited, because Meta
		// times out the handshake and the record is only for display.
		void this.webhookVerification.markVerified(context.agentId);
		this.setupTelemetry.webhookVerified(context.agentId, 'setup');
		return { status: 200, body: challenge, raw: true };
	}

	/**
	 * Starts the typing indicator when a queued message is picked up, which is
	 * when the agent actually starts working on it.
	 */
	async createResumeExecutionContext(params: {
		thread: BridgeMessageContextParams['thread'];
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
		integration?: AgentIntegrationConfig;
	}): Promise<BridgeResumeExecutionContext> {
		if (!whatsAppSettings(params.integration).typingIndicator) return {};
		return await Promise.resolve({
			statusHandle: startTypingIndicator(params.thread, {
				logger: params.logger,
				agentId: params.agentId,
				platform: 'WhatsApp',
				refreshMs: WHATSAPP_TYPING_REFRESH_MS,
			}),
		});
	}

	shouldDownloadAttachments(integration: AgentIntegrationConfig): boolean {
		return whatsAppSettings(integration).downloadMedia;
	}

	buildOriginDraft(_input: OriginInput, decoded: DecodedThread) {
		return buildWhatsAppOriginDraft(decoded);
	}

	/** Episodic memory stays off until this channel defines its ownership policy. */
	resolveEpisodicScope() {
		return null;
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
		// The adapter does not need the WABA ID to send. Templates belong to the
		// WABA, not to the phone number, so `list_templates` reads them from it.
		const fetchMessageTemplates = this.createTemplateFetcher(
			this.extractBusinessAccountId(ctx.credential),
			config.accessToken,
			config.appSecret,
		);

		const [{ WhatsAppAdapter: AdapterClass }, sdk] = await Promise.all([
			loadWhatsAppAdapter(),
			loadChatSdk(),
		]);
		const logger = this.logger;
		const channelRateLimitGuard = this.channelRateLimitGuard;
		// Automatic agent replies post through this adapter directly, bypassing
		// the shared action executor (see module doc), so this is the one place
		// that must record and check the cross-turn cooldown itself — otherwise
		// a persistent limit would let every later reply start its own full
		// retry cycle against an already-limited number instead of failing fast.
		const connectionId = buildIntegrationConnectionId(ctx.integration);
		const webhookVerification = this.webhookVerification;
		const setupTelemetry = this.setupTelemetry;
		const agentId = ctx.agentId;
		const deliveryFailureLimiter = new DeliveryFailureRecoveryLimiter(
			DELIVERY_FAILURE_RECOVERY_WINDOW_MS,
			DELIVERY_FAILURE_MAX_RECOVERIES,
		);

		// Wraps the real adapter to enforce the 24-hour customer service window
		// and the rate-limit backoff (see module doc). `stream` needs no override
		// of its own — the base adapter's `stream` already delegates to
		// `this.postMessage`.
		class ConversationWindowGuardedAdapter extends AdapterClass {
			// A connected channel answers Meta's handshake here, not in
			// `handleUnauthenticatedWebhook`. Record it too, so a later setup of
			// the same agent still confirms the step.
			protected override handleVerificationChallenge(request: Request): Response {
				const response = super.handleVerificationChallenge(request);
				if (response.status === 200) {
					void webhookVerification.markVerified(agentId);
					setupTelemetry.webhookVerified(agentId, 'connected');
				}
				return response;
			}

			// Inbound threads use the digits-only `wa_id`. A model often sends
			// "+43…", which would open a different thread and break reply binding.
			override async openDM(userId: string): Promise<string> {
				const waId = userId.replace(/\D/g, '');
				if (!waId) throw new UserError('The WhatsApp user ID must be a phone number.');
				return await super.openDM(waId);
			}

			// Meta accepts a free-form send outside the 24-hour window and reports
			// the failure later, in a status webhook. The agent has already been told
			// the send worked, so this tells it again and lets it send a template.
			override async handleWebhook(
				request: Request,
				options?: Parameters<InstanceType<typeof AdapterClass>['handleWebhook']>[1],
			): Promise<Response> {
				const rawBody = request.method === 'POST' ? await request.clone().text() : undefined;
				const response = await super.handleWebhook(request, options);
				// The base class returns 200 only for a valid signature.
				if (rawBody && response.ok) this.reportWindowClosedFailures(rawBody, options);
				return response;
			}

			private reportWindowClosedFailures(
				rawBody: string,
				options?: Parameters<InstanceType<typeof AdapterClass>['handleWebhook']>[1],
			): void {
				let payload: unknown;
				try {
					payload = JSON.parse(rawBody);
				} catch {
					return;
				}
				for (const failure of parseWindowClosedFailures(payload)) {
					if (!isRecentFailure(failure)) continue;
					if (!deliveryFailureLimiter.tryAcquire(failure)) continue;
					logger.info('[WhatsAppIntegration] Free-form send failed outside the 24h window', {
						agentId,
					});
					this.handleInboundMessage(
						{
							id: `${failure.messageId}${DELIVERY_FAILURE_MESSAGE_ID_SUFFIX}`,
							from: failure.recipientId,
							timestamp: failure.timestamp,
							type: 'text',
							text: { body: DELIVERY_FAILURE_NOTICE },
						},
						undefined,
						failure.phoneNumberId,
						options,
					);
				}
			}

			override async postMessage(
				threadId: string,
				message: AdapterPostableMessage,
			): Promise<RawMessage<WhatsAppRawMessage>> {
				await assertCustomerServiceWindowOpen(this.chat, sdk, threadId, logger);
				return await super.postMessage(threadId, message);
			}

			override async graphApiRequest<T = unknown>(path: string, body: unknown): Promise<T> {
				const recipient = isRecord(body) && typeof body.to === 'string' ? body.to : undefined;
				try {
					return await withWhatsAppRateLimitBackoff(
						async () => await super.graphApiRequest<T>(path, body),
						logger,
						{ guard: channelRateLimitGuard, connectionId, recipient },
					);
				} catch (error) {
					// Without cached inbound history the window guard lets a send
					// through, and Meta then refuses it for the same reason.
					if (isReengagementError(error)) throw new UserError(WINDOW_CLOSED_MESSAGE);
					throw error;
				}
			}

			async fetchMessageTemplates(qs: Record<string, string>): Promise<WhatsAppGraphResponse> {
				return await fetchMessageTemplates(qs);
			}

			// The adapter returns null for `contacts`, which drops the message.
			// Summarize shared contact cards as text so the agent still gets them.
			protected override extractTextContent(message: WhatsAppRawMessage['message']) {
				if (message.type === 'contacts') return formatSharedContacts(message);
				return super.extractTextContent(message);
			}

			// The adapter adds a location as a URL-only pseudo-file (a Maps link with
			// no bytes). The bridge cannot download it, and the text summary already
			// carries the location, so drop it.
			protected override buildAttachments(inbound: WhatsAppRawMessage['message']) {
				const attachments = super.buildAttachments(inbound);
				return inbound.type === 'location'
					? attachments.filter((attachment) => attachment.fetchData !== undefined)
					: attachments;
			}
		}

		return new ConversationWindowGuardedAdapter(config);
	}

	getFailedSendReport(
		message: Message<unknown>,
	): { messageId: string; chatNotice: string } | undefined {
		if (!isDeliveryFailureNotice(message)) return undefined;
		return {
			messageId: message.id.slice(0, -DELIVERY_FAILURE_MESSAGE_ID_SUFFIX.length),
			chatNotice: DELIVERY_FAILURE_CHAT_NOTICE,
		};
	}

	/**
	 * A delivery notice is not a customer message, and a normal reply to it
	 * would fail for the same reason as the send. The agent may end the turn
	 * silently.
	 */
	getReplyExpectation({ message }: { message: Message<unknown> }): ReplyExpectation {
		return isDeliveryFailureNotice(message) ? 'optional' : 'required';
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
	 * The Cloud API caps a message at 3 reply buttons and a list at 10 rows.
	 * Extra buttons fold into a list, and a long list is split into pages.
	 */
	async normalizeComponents(
		components: SuspendComponent[],
		context: NormalizeComponentsContext,
	): Promise<SuspendComponent[]> {
		return await this.paginateSelect(this.foldButtonsIntoSelect(components, context), context);
	}

	private foldButtonsIntoSelect(
		components: SuspendComponent[],
		context: NormalizeComponentsContext,
	): SuspendComponent[] {
		const buttons = components.filter((c) => c.type === 'button');
		if (buttons.length <= WHATSAPP_MAX_REPLY_BUTTONS) return components;

		const existingSelect = components.find((c) => c.type === 'select' || c.type === 'radio_select');
		if (existingSelect) {
			// Merge into it instead of pushing a second one: WhatsApp's list
			// message only supports one set of rows. Its options already resume
			// through the native select decode path, so the overflow buttons
			// fall back to that same raw encoding here — one select can't mix
			// a button-style and a select-style resume under a single id.
			const overflowOptions = buttons.map((b) => ({
				label: b.label ?? componentTextToString(b.text) ?? b.value ?? '',
				value: b.value ?? b.label ?? '',
			}));
			return components
				.filter((c) => c.type !== 'button')
				.map((c) =>
					c === existingSelect ? { ...c, options: [...(c.options ?? []), ...overflowOptions] } : c,
				);
		}

		// More than 3 options don't fit WhatsApp's reply-button limit, but
		// WhatsApp list messages allow far more entries — convert the overflow
		// into a `select` so the action stays completable from WhatsApp. Each
		// option's value is wrapped exactly as a real button's would be, and
		// the select's id uses that same `resume:` encoding (see
		// `NormalizeComponentsContext`), so tapping an option resumes with the
		// shape the tool's schema expects instead of a select's fixed
		// `{ type, id, value }`.
		const normalized = components.filter((c) => c.type !== 'button');
		normalized.push({
			type: 'select',
			id: `resume:${context.runId}:${context.toolCallId}:0`,
			label: 'Choose an option',
			options: buttons.map((b) => ({
				label: b.label ?? componentTextToString(b.text) ?? b.value ?? '',
				value: context.wrapResumeValue(b.value ?? b.label ?? ''),
			})),
		});
		return normalized;
	}

	/**
	 * Reads go through `OutboundHttp`, because the adapter can only POST. Each
	 * request carries an `appsecret_proof`, the same as the credential check.
	 */
	private createTemplateFetcher(
		businessAccountId: string,
		accessToken: string,
		appSecret: string,
	): FetchWhatsAppTemplates {
		const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
		const client = this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' });
		return async (qs) =>
			await client.request<WhatsAppGraphResponse>({
				method: 'GET',
				url: `${GRAPH_API_BASE_URL}/${encodeURIComponent(businessAccountId)}/message_templates`,
				qs: { ...qs, appsecret_proof: proof },
				headers: { Authorization: `Bearer ${accessToken}` },
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: WHATSAPP_TEMPLATE_REQUEST_TIMEOUT_MS,
			});
	}

	/**
	 * A WhatsApp list holds at most 10 rows. For a longer list, the first page
	 * shows 9 options and a "More…" row. The full list is kept in the option
	 * store, and {@link claimAction} sends the next page when the user taps it.
	 */
	private async paginateSelect(
		components: SuspendComponent[],
		context: NormalizeComponentsContext,
	): Promise<SuspendComponent[]> {
		const select = components.find((c) => c.type === 'select' || c.type === 'radio_select');
		if (!select?.options || select.options.length <= WHATSAPP_MAX_LIST_ROWS) return components;

		let options: PagedOption[] = select.options;
		if (options.length > WHATSAPP_MAX_PAGED_OPTIONS) {
			this.logger.warn(
				`[WhatsAppIntegration] Dropping ${options.length - WHATSAPP_MAX_PAGED_OPTIONS} list options — a list shows at most ${WHATSAPP_MAX_PAGED_OPTIONS}.`,
			);
			options = options.slice(0, WHATSAPP_MAX_PAGED_OPTIONS);
		}

		const prompt = components
			.filter((c) => c.type === 'section')
			.map((c) => componentTextToString(c.text))
			.filter(Boolean)
			.join('\n\n');
		const key = await this.optionPages.save({
			options,
			label: select.label,
			title: context.title,
			prompt: prompt || undefined,
		});
		if (!key) {
			// Without the stored list, a "More…" row cannot open the next page.
			// Show the first 10 options and no "More…" row.
			return components.map((c) =>
				c === select ? { ...c, options: options.slice(0, WHATSAPP_MAX_LIST_ROWS) } : c,
			);
		}
		const page = getOptionPage(options, 0);
		const rows = [...page.options, this.buildMoreOption(options, key, page.nextPage)];
		return components.map((c) => (c === select ? { ...c, options: rows } : c));
	}

	private buildMoreOption(
		options: PagedOption[],
		key: string,
		nextPage: number | undefined,
	): PagedOption {
		const next = getOptionPage(options, nextPage ?? 0);
		const first = next.start + 1;
		const last = next.start + next.options.length;
		return {
			label: 'More…',
			value: encodePageValue(key, nextPage ?? 0),
			description: `Options ${first}–${last} of ${options.length}`,
		};
	}

	/**
	 * A tap on a "More…" row is not a resume. It sends the next page of options
	 * as a new message, because WhatsApp cannot edit or delete a message.
	 */
	async claimAction(event: ActionEvent): Promise<boolean> {
		const target = parsePageValue(event.value);
		if (!target) return false;

		const { thread } = event;
		if (!thread) return true;

		const stored = await this.optionPages.get(target.key);
		const page = stored && getOptionPage(stored.options, target.pageIndex);
		if (!stored || !page || page.options.length === 0) {
			await thread.post(OPTIONS_EXPIRED_NOTICE);
			return true;
		}

		const rows =
			page.nextPage === undefined
				? page.options
				: [...page.options, this.buildMoreOption(stored.options, target.key, page.nextPage)];
		const first = page.start + 1;
		const last = page.start + page.options.length;
		const sdk = await loadChatSdk();
		// Repeat the original question, so the list still makes sense when the
		// first message has scrolled out of view.
		const card = sdk.Card({
			title: stored.title,
			children: [
				...(stored.prompt ? [sdk.Section([sdk.CardText(stored.prompt)] as never)] : []),
				sdk.Section([
					sdk.CardText(`Options ${first}–${last} of ${stored.options.length}`),
				] as never),
				// The tapped row's id carries the id of the original select, so a pick
				// on this page resumes the same way as a pick on the first page.
				sdk.Actions([
					sdk.Select({
						id: event.actionId,
						label: stored.label ?? 'Choose an option',
						options: rows,
					}),
				] as never),
			] as never,
		});
		await thread.post({ card });
		return true;
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
		return deriveWhatsAppVerifyToken(this.instanceSettings.hmacSignatureSecret, agentId);
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

/** The channel's settings, with the defaults for any that were never saved. */
function whatsAppSettings(integration?: AgentIntegrationConfig) {
	return resolveWhatsAppSettings(
		integration?.type === 'whatsapp' ? integration.settings : undefined,
	);
}

/**
 * Summarize a `contacts` message in the same bracketed style the adapter uses
 * for other non-text types (e.g. `[Location: ...]`). The adapter's inbound
 * type does not declare the `contacts` field, so read it defensively.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#contacts-messages
 */
function formatSharedContacts(message: unknown): string {
	const contacts = isRecord(message) && Array.isArray(message.contacts) ? message.contacts : [];
	const lines = contacts.map((contact: unknown) => {
		const name = isRecord(contact) ? stringProperty(contact.name, 'formatted_name') : undefined;
		const phones = isRecord(contact) && Array.isArray(contact.phones) ? contact.phones : [];
		const phoneNumbers = phones
			.map((phone: unknown) => stringProperty(phone, 'phone'))
			.filter((phone): phone is string => phone !== undefined);
		const parts = name ? [name, ...phoneNumbers] : phoneNumbers;
		return parts.length > 0 ? `[Contact: ${parts.join(' - ')}]` : '[Contact]';
	});
	return lines.length > 0 ? lines.join('\n') : '[Contact]';
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
		throw new UserError(WINDOW_CLOSED_MESSAGE);
	}
}

/** The guarded adapter from {@link WhatsAppIntegration.createAdapter}, as the template tools use it. */
interface WhatsAppTemplateAdapter {
	fetchMessageTemplates: FetchWhatsAppTemplates;
	openDM(userId: string): Promise<string>;
	sendTemplate(
		threadId: string,
		template: Awaited<ReturnType<typeof buildWhatsAppTemplateMessage>>,
	): Promise<{ id: string }>;
}

function templateAdapter(chat: PlatformActionParams['chat']): WhatsAppTemplateAdapter | undefined {
	const adapter: unknown = chat?.getAdapter('whatsapp');
	return isTemplateAdapter(adapter) ? adapter : undefined;
}

function isTemplateAdapter(adapter: unknown): adapter is WhatsAppTemplateAdapter {
	return (
		isRecord(adapter) &&
		typeof adapter.fetchMessageTemplates === 'function' &&
		typeof adapter.openDM === 'function' &&
		typeof adapter.sendTemplate === 'function'
	);
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
 * Details for a transient "you're sending too fast" failure (see
 * {@link WHATSAPP_RATE_LIMIT_ERROR_CODES}), `undefined` for anything else —
 * including a template rejected for negative feedback (code 131051), which
 * is a real content problem, not a rate limit, and must not be retried.
 *
 * Checks `error.name` rather than `error instanceof AdapterError`: the class
 * is dynamically ESM-imported (see `esm-loader.ts`), and nothing guarantees
 * that reference is the identical `AdapterError` the `@chat-adapter/whatsapp`
 * package throws internally — a subtly different import path for the same
 * published module (e.g. under test, where a mock replaces the loader) can
 * resolve a distinct module instance whose class fails `instanceof` against
 * this one even though it is, in every way that matters, the same error.
 * `name` is a plain string set in the constructor, so it survives that.
 */
function whatsAppRateLimitDetails(error: unknown): WhatsAppApiErrorDetails | undefined {
	if (!(error instanceof Error) || error.name !== 'AdapterError') return undefined;
	const details = parseWhatsAppApiError(error.message);
	if (!details) return undefined;
	const isRateLimit =
		details.status === 429 ||
		(details.code !== undefined && WHATSAPP_RATE_LIMIT_ERROR_CODES.has(details.code));
	return isRateLimit ? details : undefined;
}

/** Meta refused a free-form send because the customer service window has closed. */
function isReengagementError(error: unknown): boolean {
	if (!(error instanceof Error) || error.name !== 'AdapterError') return false;
	return parseWhatsAppApiError(error.message)?.code === WHATSAPP_REENGAGEMENT_ERROR_CODE;
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
 * Still a 429 to callers, so the agent sees a rate-limit result. The scope
 * marker stops `caughtIntegrationError` from also blocking the whole
 * connection, because only this one recipient is limited.
 */
function recipientRateLimitError(cause?: unknown): OperationalError {
	return Object.assign(
		new OperationalError(
			'WhatsApp is rate-limiting messages to this recipient. Wait before sending them more messages.',
			{ cause },
		),
		{
			response: { status: 429 },
			rateLimitScope: 'recipient',
		} satisfies RecipientScopedRateLimitError,
	);
}

/**
 * Retries a send after one of Meta's transient rate-limit errors, waiting
 * longer each time instead of retrying immediately — see module doc for why
 * hammering a rate-limited number is exactly the behaviour that got it
 * rate-limited. Any other error, or the last attempt, is rethrown as-is.
 *
 * Automatic agent replies post through this wrapper directly (see
 * {@link WhatsAppIntegration.createAdapter}), bypassing the shared action
 * executor that would otherwise consult `ChannelRateLimitGuard` on its own.
 * So this checks and records that same guard itself: a connection already
 * cooling down fails immediately instead of running a fresh retry cycle, and
 * a rate limit that never clears within these attempts both surfaces as an
 * `OperationalError` shaped as a 429 and starts the cooldown for later calls
 * — the same "stop hammering it and fail gracefully" behaviour every other
 * channel already gets, layered on top of the short local backoff above for
 * the common, momentary case.
 *
 * {@link WHATSAPP_PAIR_RATE_LIMIT_CODE} records its cooldown per recipient
 * instead, so it doesn't cool down every other conversation on the number.
 * Its error carries a scope marker (see {@link recipientRateLimitError}) so
 * the action executor doesn't block the whole connection either.
 */
async function withWhatsAppRateLimitBackoff<T>(
	send: () => Promise<T>,
	logger: Logger,
	rateLimit: { guard: ChannelRateLimitGuard; connectionId: string; recipient?: string },
): Promise<T> {
	const pairKey = rateLimit.recipient
		? `${rateLimit.connectionId}:${rateLimit.recipient}`
		: undefined;
	if (rateLimit.guard.isBlocked(rateLimit.connectionId)) {
		throw Object.assign(new OperationalError(channelRateLimitMessage('whatsapp')), {
			response: { status: 429 },
		} satisfies HttpStatusCarryingError);
	}
	if (pairKey && rateLimit.guard.isBlocked(pairKey)) {
		throw recipientRateLimitError();
	}
	for (let attempt = 1; ; attempt++) {
		try {
			return await send();
		} catch (error) {
			const details = whatsAppRateLimitDetails(error);
			if (!details) throw error;
			if (attempt >= WHATSAPP_RATE_LIMIT_MAX_ATTEMPTS) {
				if (details.code === WHATSAPP_PAIR_RATE_LIMIT_CODE && pairKey) {
					rateLimit.guard.record(pairKey);
					throw recipientRateLimitError(error);
				}
				rateLimit.guard.record(rateLimit.connectionId);
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
			// A delivery notice is not from the customer, so it must not reopen the window.
			if (message.author.isMe || isDeliveryFailureNotice(message)) continue;
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
