/**
 * Anthropic Chat Model Node - Version 1.2
 * Language Model Anthropic
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV12Config {
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAnthropicV12Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatAnthropicV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1.2;
	credentials?: LcLmChatAnthropicV12Credentials;
	isTrigger: true;
}

export type LcLmChatAnthropicV12Node = LcLmChatAnthropicV12NodeBase & {
	config: NodeConfig<LcLmChatAnthropicV12Config>;
};

export type LcLmChatAnthropicV12Node = LcLmChatAnthropicV12Node;