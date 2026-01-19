/**
 * Chat Trigger Node - Version 1.3
 * Runs the workflow when an n8n generated webchat is submitted
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Chat on a page served by n8n */
export type LcChatTriggerV13HostedChatConfig = {
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
export type LcChatTriggerV13WebhookConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcChatTriggerV13Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChatTriggerV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.chatTrigger';
	version: 1.3;
	credentials?: LcChatTriggerV13Credentials;
}

export type LcChatTriggerV13HostedChatNode = LcChatTriggerV13NodeBase & {
	config: NodeConfig<LcChatTriggerV13HostedChatConfig>;
};

export type LcChatTriggerV13WebhookNode = LcChatTriggerV13NodeBase & {
	config: NodeConfig<LcChatTriggerV13WebhookConfig>;
};

export type LcChatTriggerV13Node =
	| LcChatTriggerV13HostedChatNode
	| LcChatTriggerV13WebhookNode
	;