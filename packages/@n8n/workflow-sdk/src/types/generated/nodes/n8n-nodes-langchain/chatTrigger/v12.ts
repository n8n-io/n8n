/**
 * Chat Trigger Node - Version 1.2
 * Runs the workflow when an n8n generated webchat is submitted
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Chat on a page served by n8n */
export type LcChatTriggerV12HostedChatConfig = {
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
	options?: Record<string, unknown>;
};

/** Chat through a widget embedded in another page, or by calling a webhook */
export type LcChatTriggerV12WebhookConfig = {
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
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcChatTriggerV12Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChatTriggerV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.chatTrigger';
	version: 1.2;
	credentials?: LcChatTriggerV12Credentials;
}

export type LcChatTriggerV12HostedChatNode = LcChatTriggerV12NodeBase & {
	config: NodeConfig<LcChatTriggerV12HostedChatConfig>;
};

export type LcChatTriggerV12WebhookNode = LcChatTriggerV12NodeBase & {
	config: NodeConfig<LcChatTriggerV12WebhookConfig>;
};

export type LcChatTriggerV12Node =
	| LcChatTriggerV12HostedChatNode
	| LcChatTriggerV12WebhookNode
	;