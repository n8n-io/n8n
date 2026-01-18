/**
 * Embeddings Mistral Cloud Node Types
 *
 * Use Embeddings Mistral Cloud
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingsmistralcloud/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsMistralCloudV1Params {
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

export type LcEmbeddingsMistralCloudV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsMistralCloud';
	version: 1;
	config: NodeConfig<LcEmbeddingsMistralCloudV1Params>;
	credentials?: LcEmbeddingsMistralCloudV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsMistralCloudNode = LcEmbeddingsMistralCloudV1Node;
