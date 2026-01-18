/**
 * Embeddings Google Vertex Node Types
 *
 * Use Google Vertex Embeddings
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingsgooglevertex/
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

export interface LcEmbeddingsGoogleVertexV1Params {
	/**
	 * Select or enter your Google Cloud project ID
	 * @default {"mode":"list","value":""}
	 */
	projectId: ResourceLocatorValue;
	/**
	 * The model which will generate the embeddings. &lt;a href="https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api"&gt;Learn more&lt;/a&gt;.
	 * @default text-embedding-005
	 */
	modelName?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsGoogleVertexV1Credentials {
	googleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcEmbeddingsGoogleVertexV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsGoogleVertex';
	version: 1;
	config: NodeConfig<LcEmbeddingsGoogleVertexV1Params>;
	credentials?: LcEmbeddingsGoogleVertexV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsGoogleVertexNode = LcEmbeddingsGoogleVertexV1Node;
