/**
 * Anthropic Chat Model Node - Version 1
 * Language Model Anthropic
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.anthropic.com/claude/docs/models-overview"&gt;Learn more&lt;/a&gt;.
 * @default claude-2
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

export interface LcLmChatAnthropicV1Credentials {
	anthropicApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcLmChatAnthropicV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1;
	config: NodeConfig<LcLmChatAnthropicV1Params>;
	credentials?: LcLmChatAnthropicV1Credentials;
	isTrigger: true;
};