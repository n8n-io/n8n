/**
 * OpenAI Chat Model Node - Version 1.3
 * For advanced usage with an AI chain
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
// Node Type
// ===========================================================================

export type LcLmChatOpenAiV13Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	version: 1.3;
	config: NodeConfig<LcLmChatOpenAiV13Params>;
	credentials?: LcLmChatOpenAiV13Credentials;
	isTrigger: true;
};