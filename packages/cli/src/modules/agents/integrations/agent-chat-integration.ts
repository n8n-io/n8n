import { Service } from '@n8n/di';
import type { Thread } from 'chat';

import type { SuspendComponent } from './component-mapper';

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

/**
 * A chat platform (Slack, Telegram, …) that an agent can be connected to.
 *
 * Encapsulates everything platform-specific in one place: adapter construction,
 * credential extraction, capability metadata used by the rich_interaction tool,
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
	 * Component types this platform supports in rich_interaction cards.
	 * Omit to signal that the platform has no rich_interaction surface — the
	 * tool won't be injected into agents targeting this platform.
	 */
	readonly supportedComponents?: string[];

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
}

/**
 * Singleton registry of AgentChatIntegration implementations.
 *
 * Platforms register themselves during module init (`agents.module.ts`).
 * Consumers (ChatIntegrationService, ComponentMapper, createRichInteractionTool,
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
}
