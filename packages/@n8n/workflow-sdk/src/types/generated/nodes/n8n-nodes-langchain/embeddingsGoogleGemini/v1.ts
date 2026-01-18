/**
 * Embeddings Google Gemini Node - Version 1
 * Use Google Gemini Embeddings
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
// Node Type
// ===========================================================================

export type LcEmbeddingsGoogleGeminiV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini';
	version: 1;
	config: NodeConfig<LcEmbeddingsGoogleGeminiV1Params>;
	credentials?: LcEmbeddingsGoogleGeminiV1Credentials;
	isTrigger: true;
};