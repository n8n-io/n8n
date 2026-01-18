/**
 * OpenAI Chat Model Node Types
 *
 * For advanced usage with an AI chain
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatopenai/
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

export interface LcLmChatOpenAiV13Params {
	/**
	 * The model which will generate the completion. &lt;a href="https://beta.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
	 * @default gpt-5-mini
	 */
	model?: string | Expression<string>;
	/**
	 * Whether to use the Responses API to generate the response. &lt;a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/#use-responses-api"&gt;Learn more&lt;/a&gt;.
	 * @default true
	 */
	responsesApiEnabled?: boolean | Expression<boolean>;
	builtInTools?: Record<string, unknown>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatOpenAiV13Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatOpenAiV13Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcLmChatOpenAiV13Params>;
	credentials?: LcLmChatOpenAiV13Credentials;
	isTrigger: true;
};

export type LcLmChatOpenAiNode = LcLmChatOpenAiV13Node;
