/**
 * Embeddings Mistral Cloud Node - Version 1
 * Use Embeddings Mistral Cloud
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsMistralCloudV1Config {
/**
 * The model which will compute the embeddings. &lt;a href="https://docs.mistral.ai/platform/endpoints/"&gt;Learn more&lt;/a&gt;.
 * @default mistral-embed
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

export interface LcEmbeddingsMistralCloudV1Credentials {
	mistralCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcEmbeddingsMistralCloudV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsMistralCloud';
	version: 1;
	credentials?: LcEmbeddingsMistralCloudV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsMistralCloudV1Node = LcEmbeddingsMistralCloudV1NodeBase & {
	config: NodeConfig<LcEmbeddingsMistralCloudV1Config>;
};

export type LcEmbeddingsMistralCloudV1Node = LcEmbeddingsMistralCloudV1Node;