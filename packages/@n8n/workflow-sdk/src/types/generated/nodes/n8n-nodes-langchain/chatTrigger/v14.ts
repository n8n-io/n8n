/**
 * Chat Trigger Node - Version 1.4
 * Runs the workflow when an n8n generated webchat is submitted
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Chat on a page served by n8n */
export type LcChatTriggerV14HostedChatConfig = {
	mode: 'hostedChat';
/**
 * Whether the chat should be publicly available or only accessible through the manual chat interface
 * @default false
 */
		public?: boolean | Expression<boolean>;
/**
 * Default messages shown at the start of the chat, one per line
 * @displayOptions.show { mode: ["hostedChat"], public: [true] }
 * @default Hi there! 👋
My name is Nathan. How can I assist you today?
 */
		initialMessages?: string | Expression<string>;
/**
 * Whether to make the agent available in n8n Chat
 * @default false
 */
		availableInChat?: boolean | Expression<boolean>;
};

/** Chat through a widget embedded in another page, or by calling a webhook */
export type LcChatTriggerV14WebhookConfig = {
	mode: 'webhook';
/**
 * Whether the chat should be publicly available or only accessible through the manual chat interface
 * @default false
 */
		public?: boolean | Expression<boolean>;
/**
 * Whether to make the agent available in n8n Chat
 * @default false
 */
		availableInChat?: boolean | Expression<boolean>;
};

export type LcChatTriggerV14Params =
	| LcChatTriggerV14HostedChatConfig
	| LcChatTriggerV14WebhookConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcChatTriggerV14Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChatTriggerV14Node = {
	type: '@n8n/n8n-nodes-langchain.chatTrigger';
	version: 1.4;
	config: NodeConfig<LcChatTriggerV14Params>;
	credentials?: LcChatTriggerV14Credentials;
};