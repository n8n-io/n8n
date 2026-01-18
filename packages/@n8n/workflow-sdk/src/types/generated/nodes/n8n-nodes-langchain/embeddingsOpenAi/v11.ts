/**
 * Embeddings OpenAI Node - Version 1.1
 * Use Embeddings OpenAI
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOpenAiV11Params {
/**
 * The model which will generate the embeddings. &lt;a href="https://platform.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
 * @default text-embedding-3-small
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

export interface LcEmbeddingsOpenAiV11Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcEmbeddingsOpenAiV11Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi';
	version: 1.1;
	config: NodeConfig<LcEmbeddingsOpenAiV11Params>;
	credentials?: LcEmbeddingsOpenAiV11Credentials;
	isTrigger: true;
};