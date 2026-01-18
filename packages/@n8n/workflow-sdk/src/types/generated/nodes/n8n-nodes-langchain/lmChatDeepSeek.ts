/**
 * DeepSeek Chat Model Node Types
 *
 * For advanced usage with an AI chain
 * @subnodeType ai_languageModel
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatdeepseek/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatDeepSeekV1Params {
	/**
	 * The model which will generate the completion. &lt;a href="https://api-docs.deepseek.com/quick_start/pricing"&gt;Learn more&lt;/a&gt;.
	 * @default deepseek-chat
	 */
	model?: string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatDeepSeekV1Credentials {
	deepSeekApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatDeepSeekV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek';
	version: 1;
	config: NodeConfig<LcLmChatDeepSeekV1Params>;
	credentials?: LcLmChatDeepSeekV1Credentials;
	isTrigger: true;
};

export type LcLmChatDeepSeekNode = LcLmChatDeepSeekV1Node;
