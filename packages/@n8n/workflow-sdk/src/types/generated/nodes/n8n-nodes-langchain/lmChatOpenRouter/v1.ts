/**
 * OpenRouter Chat Model Node - Version 1
 * For advanced usage with an AI chain
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatOpenRouterV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://openrouter.ai/docs/models"&gt;Learn more&lt;/a&gt;.
 * @default openai/gpt-4.1-mini
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

export interface LcLmChatOpenRouterV1Credentials {
	openRouterApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatOpenRouterV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
	version: 1;
	credentials?: LcLmChatOpenRouterV1Credentials;
	isTrigger: true;
}

export type LcLmChatOpenRouterV1ParamsNode = LcLmChatOpenRouterV1NodeBase & {
	config: NodeConfig<LcLmChatOpenRouterV1Params>;
};

export type LcLmChatOpenRouterV1Node = LcLmChatOpenRouterV1ParamsNode;