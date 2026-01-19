/**
 * Embeddings Google Vertex Node - Version 1
 * Use Google Vertex Embeddings
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsGoogleVertexV1Config {
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

interface LcEmbeddingsGoogleVertexV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsGoogleVertex';
	version: 1;
	credentials?: LcEmbeddingsGoogleVertexV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsGoogleVertexV1Node = LcEmbeddingsGoogleVertexV1NodeBase & {
	config: NodeConfig<LcEmbeddingsGoogleVertexV1Config>;
};

export type LcEmbeddingsGoogleVertexV1Node = LcEmbeddingsGoogleVertexV1Node;