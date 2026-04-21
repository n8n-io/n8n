import { Service } from '@n8n/di';

import type { SuspendComponent } from './component-mapper';

/** Per-connection context handed to Integration hooks. */
export interface IntegrationContext {
	agentId: string;
	projectId: string;
	credential: Record<string, unknown>;
	/** Returns the inbound webhook URL this n8n instance exposes for the given platform. */
	webhookUrlFor: (platform: string) => string;
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
export abstract class Integration {
	/** Platform identifier (`'slack'`, `'telegram'`, …). */
	abstract readonly type: string;

	/** Credential types accepted by the frontend selector. */
	abstract readonly credentialTypes: string[];

	/** Component types this platform supports in rich_interaction cards. */
	abstract readonly supportedComponents: string[];

	/** User-facing description used by `createRichInteractionTool`. */
	abstract readonly description: string;

	/**
	 * True if this platform has a small callback_data limit (Telegram: 64 bytes).
	 * When true, buttons encode a short key that the bridge resolves via the
	 * CallbackStore instead of carrying the full payload.
	 */
	readonly needsShortCallbackData: boolean = false;

	/** Build the Chat SDK adapter for this platform. */
	abstract createAdapter(ctx: IntegrationContext): Promise<unknown>;

	/** Optional hook run AFTER `chat.initialize()`. Throwing triggers cleanup. */
	onAfterConnect?(ctx: IntegrationContext): Promise<void>;

	/** Optional hook run BEFORE `chat.shutdown()`. Errors here are logged, not thrown. */
	onBeforeDisconnect?(ctx: IntegrationContext): Promise<void>;

	/**
	 * Optional per-platform component normalization (applied before toCard).
	 * Convert unsupported types into close-enough equivalents — e.g. Telegram
	 * turns select options into individual buttons.
	 */
	normalizeComponents?(components: SuspendComponent[]): SuspendComponent[];
}

/**
 * Singleton registry of Integration implementations.
 *
 * Platforms register themselves during module init (`agents.module.ts`).
 * Consumers (ChatIntegrationService, ComponentMapper, createRichInteractionTool,
 * AgentChatBridge) look up integrations by type.
 */
@Service()
export class IntegrationRegistry {
	private readonly integrations = new Map<string, Integration>();

	register(integration: Integration): void {
		this.integrations.set(integration.type, integration);
	}

	get(type: string): Integration | undefined {
		return this.integrations.get(type);
	}

	require(type: string): Integration {
		const integration = this.integrations.get(type);
		if (!integration) throw new Error(`Unknown integration type: ${type}`);
		return integration;
	}

	list(): Integration[] {
		return [...this.integrations.values()];
	}
}
