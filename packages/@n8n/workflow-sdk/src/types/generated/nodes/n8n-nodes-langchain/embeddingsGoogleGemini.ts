/**
 * Embeddings Google Gemini Node Types
 *
 * Use Google Gemini Embeddings
 * @subnodeType ai_embedding
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingsgooglegemini/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsGoogleGeminiV1Params {
	/**
	 * The model which will generate the embeddings. &lt;a href="https://developers.generativeai.google/api/rest/generativelanguage/models/list"&gt;Learn more&lt;/a&gt;.
	 * @default models/text-embedding-004
	 */
	modelName?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsGoogleGeminiV1Credentials {
	googlePalmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcEmbeddingsGoogleGeminiV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini';
	version: 1;
	config: NodeConfig<LcEmbeddingsGoogleGeminiV1Params>;
	credentials?: LcEmbeddingsGoogleGeminiV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsGoogleGeminiNode = LcEmbeddingsGoogleGeminiV1Node;
