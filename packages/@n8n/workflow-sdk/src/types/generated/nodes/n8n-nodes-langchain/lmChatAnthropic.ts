/**
 * Anthropic Chat Model Node Types
 *
 * Language Model Anthropic
 * @subnodeType ai_languageModel
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatanthropic/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAnthropicV13Params {
	/**
	 * The model which will generate the completion. &lt;a href="https://docs.anthropic.com/claude/docs/models-overview"&gt;Learn more&lt;/a&gt;.
	 * @default claude-2
	 */
	model?:
		| 'claude-3-5-sonnet-20241022'
		| 'claude-3-opus-20240229'
		| 'claude-3-5-sonnet-20240620'
		| 'claude-3-sonnet-20240229'
		| 'claude-3-5-haiku-20241022'
		| 'claude-3-haiku-20240307'
		| 'claude-2'
		| 'claude-2.1'
		| 'claude-instant-1.2'
		| 'claude-instant-1'
		| Expression<string>;
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

export type LcLmChatAnthropicV13Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcLmChatAnthropicV13Params>;
	credentials?: LcLmChatAnthropicV13Credentials;
	isTrigger: true;
};

export type LcLmChatAnthropicNode = LcLmChatAnthropicV13Node;
