/**
 * Anthropic Chat Model Node - Version 1.1
 * Language Model Anthropic
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV11Config {
/**
 * The model which will generate the completion. &lt;a href="https://docs.anthropic.com/claude/docs/models-overview"&gt;Learn more&lt;/a&gt;.
 * @default claude-3-sonnet-20240229
 */
		model?: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-5-sonnet-20240620' | 'claude-3-sonnet-20240229' | 'claude-3-5-haiku-20241022' | 'claude-3-haiku-20240307' | 'claude-2' | 'claude-2.1' | 'claude-instant-1.2' | 'claude-instant-1' | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAnthropicV11Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatAnthropicV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1.1;
	credentials?: LcLmChatAnthropicV11Credentials;
	isTrigger: true;
}

export type LcLmChatAnthropicV11Node = LcLmChatAnthropicV11NodeBase & {
	config: NodeConfig<LcLmChatAnthropicV11Config>;
};

export type LcLmChatAnthropicV11Node = LcLmChatAnthropicV11Node;