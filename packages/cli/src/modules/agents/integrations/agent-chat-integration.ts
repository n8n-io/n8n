import { Service } from '@n8n/di';
import type { Thread, Author, Message } from 'chat';
import type { Logger } from 'n8n-workflow';

import { AgentIntegrationConfig } from '@n8n/api-types';
import type { RichCardComponentType } from '@n8n/api-types';
import type { ChatInstance } from './chat-integration.service';
import type { SuspendComponent } from './component-mapper';
import {
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from './integration-tool-definitions';
import type {
	IntegrationAction,
	IntegrationActionDefinition,
	IntegrationActionResult,
	IntegrationContextQuery,
	IntegrationContextQueryDefinition,
	IntegrationMessageContext,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';

/** Per-connection context handed to AgentChatIntegration hooks. */
export interface AgentChatIntegrationContext {
	agentId: string;
	projectId: string;
	credentialId: string;
	credential: Record<string, unknown>;
	/** Returns the inbound webhook URL this n8n instance exposes for the given platform. */
	webhookUrlFor: (platform: string) => string;
}

/** Response shape returned by `handleUnauthenticatedWebhook`. */
export interface UnauthenticatedWebhookResponse {
	status: number;
	body: unknown;
}

export interface AgentChatIntegrationBuilderGuidance {
	capabilities: string[];
	useIntegrationWhen: string[];
	useNodeToolWhen: string[];
}

export interface PlatformAgentContext {
	agentUserId?: string;
}

export interface BridgeStatusHandle {
	clearBeforeResponse(): Promise<void>;
}

/**
 * Wrap a status handle so the underlying clear runs at most once, with every
 * caller awaiting the same in-flight clear. The bridge clears both from the
 * stream consumer (right before the first response) and from its cleanup
 * path, so this wrapper keeps platform handles free of dedupe concerns.
 */
export function onceStatusHandle(
	handle: BridgeStatusHandle | undefined,
): BridgeStatusHandle | undefined {
	if (!handle) return undefined;
	let clearing: Promise<void> | undefined;
	return {
		clearBeforeResponse: async () => {
			clearing ??= handle.clearBeforeResponse();
			await clearing;
		},
	};
}

export interface BridgeExecutionContext {
	platformAgentContext: PlatformAgentContext;
	forceBuffered?: boolean;
	statusHandle?: BridgeStatusHandle;
	/**
	 * Platform-fetched conversation context (e.g. prior Slack thread messages)
	 * that the bridge prepends to the agent input message. Undefined when the
	 * platform did not surface any context for this message.
	 */
	historyContext?: string;
}

export type BridgeResumeExecutionContext = Pick<
	BridgeExecutionContext,
	'forceBuffered' | 'statusHandle'
>;

export interface BridgeMessageContextParams {
	chat: ChatInstance;
	thread: Thread<unknown, unknown>;
	message: Message<unknown>;
	logger: Logger;
	agentId: string;
	statusRetry?: AbortController;
	/**
	 * True when this is the first message that pulled the agent into the
	 * conversation (a fresh @mention / DM), false for follow-ups in an already
	 * subscribed thread. Platforms use this to decide whether to fetch prior
	 * thread context that the agent has never seen.
	 */
	isNewMention: boolean;
}

/**
 * A chat platform (Slack, Telegram, …) that an agent can be connected to.
 *
 * Encapsulates everything platform-specific in one place: adapter construction,
 * credential extraction, capability metadata used by interactive integration cards,
 * component normalization before rendering, and optional lifecycle hooks.
 *
 * The concrete subclasses live under `./platforms/`.
 */
export abstract class AgentChatIntegration {
	/** Platform identifier (`'slack'`, `'telegram'`, …). */
	abstract readonly type: string;

	/** Credential types accepted by the frontend selector. */
	abstract readonly credentialTypes: string[];

	// ---------------------------------------------------------------------------
	// FE display metadata — shown in the trigger-picker and integration cards.
	// Localizable copy (help text, connected confirmation) lives in the FE i18n
	// catalog keyed by `type`; only stable, brand-level metadata lives here.
	// ---------------------------------------------------------------------------

	/** Brand-name label shown in UI (not localized — e.g. "Slack", "Linear"). */
	abstract readonly displayLabel: string;

	/** Lucide icon name (from the shared icon set) for the integration card. */
	abstract readonly displayIcon: string;

	/**
	 * Builder-facing guidance returned by `list_integration_types`.
	 * This helps the builder choose between connecting the agent to a chat
	 * integration and adding a regular node/workflow tool for the same product.
	 */
	readonly builderGuidance?: AgentChatIntegrationBuilderGuidance;

	/**
	 * Component types this platform supports in integration action cards.
	 * Omit to signal that the platform has no rich card surface.
	 * Typed by the shared list so a new component type must be added to
	 * `RICH_CARD_COMPONENT_TYPES` in `@n8n/api-types` first — which in turn
	 * forces the wire schema and the n8n chat renderer to handle it.
	 */
	readonly supportedComponents?: readonly RichCardComponentType[];

	/** Read-only context query definitions exposed through the generated context tool. */
	readonly contextToolDefinitions: IntegrationContextQueryDefinition[] =
		resolveIntegrationContextQueryDefinitions([
			'get_current_message_context',
			'get_current_subject',
		]);

	/** Side-effecting action definitions exposed through the generated action tool. */
	readonly actionToolDefinitions: IntegrationActionDefinition[] =
		resolveIntegrationActionDefinitions(['respond']);

	/** Optional additional guidance appended to the generated context tool description. */
	readonly contextToolGuidance?: string[];

	/** Optional additional guidance appended to the generated action tool description. */
	readonly actionToolGuidance?: string[];

	/** Read-only context queries exposed through the generated integration context tool. */
	get contextQueries(): IntegrationContextQuery[] {
		return this.contextToolDefinitions.map((definition) => definition.name);
	}

	/** Side-effecting actions exposed through the generated integration action tool. */
	get actions(): IntegrationAction[] {
		return this.actionToolDefinitions.map((definition) => definition.name);
	}

	/**
	 * True if this platform has a small callback_data limit (Telegram: 64 bytes).
	 * When true, buttons encode a short key that the bridge resolves via the
	 * CallbackStore instead of carrying the full payload.
	 */
	readonly needsShortCallbackData: boolean = false;

	/**
	 * True if the bridge should buffer streaming output and post it as a single
	 * message instead of streaming text deltas via post-and-edit.
	 */
	readonly disableStreaming: boolean = false;

	/**
	 * True when this integration is an internal channel (e.g. the in-app n8n
	 * chat) that must not appear in the public integrations catalog or the
	 * add-trigger UI.
	 */
	readonly internal: boolean = false;

	/**
	 * True when this integration needs a platform Chat SDK instance (adapter +
	 * credential) to execute actions and context queries. Internal channels
	 * (e.g. the in-app n8n chat) set this to false — the executors then skip
	 * `getChatInstance` and delegate directly with `chat: undefined`.
	 */
	readonly requiresChatInstance: boolean = true;

	/**
	 * True if this integration must run on the leader main only.
	 *
	 * Polling-based platforms (e.g. Telegram in polling mode) require this so a
	 * single instance owns the long-poll loop — otherwise updates race between
	 * mains and either duplicate or get lost. Webhook-based platforms return
	 * false so any main can answer inbound webhooks (which the load balancer
	 * routes round-robin across all mains).
	 */
	requiresLeader(): boolean {
		return false;
	}

	/** Build the Chat SDK adapter for this platform. */
	abstract createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown>;

	/**
	 * Handle a webhook request that arrives before an integration is connected
	 * (i.e. before credentials are configured). The canonical case is Slack's
	 * `url_verification` challenge — sent when the user creates a Slack app
	 * from the manifest, before they have pasted bot token / signing secret
	 * into n8n. Without this hook, the standard handler returns 404 and the
	 * user has to manually re-verify URLs after configuring the credential.
	 *
	 * Implementations inspect the parsed JSON body; return a response to send
	 * back, or undefined to fall through to the standard 404.
	 *
	 * Security note: this hook bypasses signature verification, so it must
	 * only echo non-sensitive data (e.g. a challenge token sent by the caller
	 * in the request itself).
	 */
	handleUnauthenticatedWebhook?(body: unknown): UnauthenticatedWebhookResponse | undefined;

	/**
	 * Optional hook run BEFORE the adapter is built. Use it to reject the
	 * connect early — e.g. a webhook-based platform checking that the
	 * credential isn't already claimed elsewhere. Throwing aborts the connect.
	 */
	onBeforeConnect?(ctx: AgentChatIntegrationContext): Promise<void>;

	/** Optional hook run AFTER `chat.initialize()`. Throwing triggers cleanup. */
	onAfterConnect?(ctx: AgentChatIntegrationContext): Promise<void>;

	/**
	 * Optional hook run BEFORE `chat.shutdown()` — use it to release any
	 * external state owned by this integration (e.g. Telegram `deleteWebhook`
	 * to free the bot for other applications). Runs only when the disconnect
	 * is user-initiated; peer mains reacting to a multi-main PubSub broadcast,
	 * graceful shutdowns, and leader-stepdown teardown all skip this hook so
	 * the cluster-wide state isn't released by every main in turn.
	 *
	 * Errors are logged by the caller and swallowed — local teardown always
	 * proceeds so a transient remote failure can't leak in-process resources.
	 */
	onBeforeDisconnect?(ctx: AgentChatIntegrationContext): Promise<void>;

	/**
	 * Optional per-platform component normalization (applied before toCard).
	 * Convert unsupported types into close-enough equivalents — e.g. Telegram
	 * turns select options into individual buttons.
	 */
	normalizeComponents?(components: SuspendComponent[]): SuspendComponent[];

	/**
	 * Optional per-platform thread ID formatting.
	 * Used to convert between the Chat SDK thread and our format.
	 */
	formatThreadId?: {
		fromSdk: (thread: Thread<unknown, unknown>) => string;
		toSdk: (threadId: string) => string;
	};

	/**
	 * Optional per-user authorisation check called on every inbound mention,
	 * subscribed message, and action before the bridge subscribes / executes.
	 * Default (no implementation): allow. Telegram uses this to enforce the
	 * Private-mode allowlist.
	 */
	isUserAllowed?(author: Author, settings: AgentIntegrationConfig | undefined): boolean;

	/**
	 * Optional platform context needed by the bridge before execution. Slack uses
	 * this to persist the bot user ID and strip self-mentions from inbound text.
	 */
	getPlatformAgentContext?(chat: ChatInstance): PlatformAgentContext;

	/** Optional text normalization before the message is handed to the agent. */
	prepareInboundText?(text: string, context: PlatformAgentContext): string;

	/**
	 * Optional per-message execution policy for platform-specific bridge behavior,
	 * such as status indicators or forcing buffered output for a specific thread.
	 */
	createBridgeExecutionContext?(
		params: BridgeMessageContextParams,
	): Promise<BridgeExecutionContext>;

	/** Optional stream/status policy for responses after interactive resume actions. */
	createResumeExecutionContext?(params: {
		chat: ChatInstance;
		thread: Thread<unknown, unknown>;
		logger: Logger;
		agentId: string;
	}): Promise<BridgeResumeExecutionContext>;

	/**
	 * Execute a context query that this platform owns (e.g. Linear `get_issue`,
	 * Slack `search_users`). The central executor handles only the cross-platform
	 * message-context queries before delegating here.
	 *
	 * Return shape mirrors {@link IntegrationActionResult} — `{ ok: true, ... }`
	 * on success or `{ ok: false, error: { code, message } }` on failure.
	 */
	executeContextQuery?(params: PlatformContextQueryParams): Promise<unknown>;

	/**
	 * Execute a platform-specific action (e.g. Linear `create_issue`, Slack
	 * `add_reaction`). The central executor handles the cross-platform actions
	 * (`respond`, `send_dm`, `send_channel_message`) before delegating here.
	 *
	 * Return `undefined` to signal the action isn't owned by this platform — the
	 * caller then returns an `UNSUPPORTED_ACTION` error.
	 */
	executeAction?(params: PlatformActionParams): Promise<IntegrationActionResult | undefined>;
}

/** Per-platform context-query execution params. */
export interface PlatformContextQueryParams {
	/** `undefined` only for integrations with `requiresChatInstance === false`. */
	chat: ChatInstance | undefined;
	descriptor: IntegrationToolConnectionDescriptor;
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
}

/** Per-platform action-execution params. */
export interface PlatformActionParams {
	/** `undefined` only for integrations with `requiresChatInstance === false`. */
	chat: ChatInstance | undefined;
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
	currentMessageContext?: IntegrationMessageContext;
}

/**
 * Singleton registry of AgentChatIntegration implementations.
 *
 * Platforms register themselves during module init (`agents.module.ts`).
 * Consumers (ChatIntegrationService, ComponentMapper,
 * AgentChatBridge) look up integrations by type.
 */
@Service()
export class ChatIntegrationRegistry {
	private readonly integrations = new Map<string, AgentChatIntegration>();

	register(integration: AgentChatIntegration): void {
		this.integrations.set(integration.type, integration);
	}

	get(type: string): AgentChatIntegration | undefined {
		return this.integrations.get(type);
	}

	require(type: string): AgentChatIntegration {
		const integration = this.integrations.get(type);
		if (!integration) throw new Error(`Unknown integration type: ${type}`);
		return integration;
	}

	list(): AgentChatIntegration[] {
		return [...this.integrations.values()];
	}

	/** Registered integrations that appear in the public catalog (excludes internal channels). */
	listPublic(): AgentChatIntegration[] {
		return this.list().filter((integration) => !integration.internal);
	}
}
