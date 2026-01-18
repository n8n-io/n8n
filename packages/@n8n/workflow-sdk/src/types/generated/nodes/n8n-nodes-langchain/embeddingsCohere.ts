/**
 * Embeddings Cohere Node Types
 *
 * Use Cohere Embeddings
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingscohere/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsCohereV1Params {
	/**
	 * The model which will generate the embeddings. &lt;a href="https://docs.cohere.com/docs/models"&gt;Learn more&lt;/a&gt;.
	 * @default embed-english-v2.0
	 */
	modelName?:
		| 'embed-english-light-v2.0'
		| 'embed-english-light-v3.0'
		| 'embed-english-v2.0'
		| 'embed-english-v3.0'
		| 'embed-multilingual-light-v3.0'
		| 'embed-multilingual-v2.0'
		| 'embed-multilingual-v3.0'
		| Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsCohereV1Credentials {
	cohereApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcEmbeddingsCohereNode = {
	type: '@n8n/n8n-nodes-langchain.embeddingsCohere';
	version: 1;
	config: NodeConfig<LcEmbeddingsCohereV1Params>;
	credentials?: LcEmbeddingsCohereV1Credentials;
	isTrigger: true;
};
