/**
 * Anthropic Chat Model Node - Version 1.3
 * Language Model Anthropic
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV13Config {
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAnthropicV13Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatAnthropicV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1.3;
	credentials?: LcLmChatAnthropicV13Credentials;
	isTrigger: true;
}

export type LcLmChatAnthropicV13Node = LcLmChatAnthropicV13NodeBase & {
	config: NodeConfig<LcLmChatAnthropicV13Config>;
};

export type LcLmChatAnthropicV13Node = LcLmChatAnthropicV13Node;