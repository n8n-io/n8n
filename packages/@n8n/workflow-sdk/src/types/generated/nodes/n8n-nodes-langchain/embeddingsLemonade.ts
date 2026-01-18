/**
 * Embeddings Lemonade Node Types
 *
 * Use Lemonade Embeddings
 * @subnodeType ai_embedding
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingslemonade/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsLemonadeV1Params {
	/**
	 * The model which will generate the completion. Models are loaded and managed through the Lemonade server.
	 */
	model: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsLemonadeV1Credentials {
	lemonadeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcEmbeddingsLemonadeV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsLemonade';
	version: 1;
	config: NodeConfig<LcEmbeddingsLemonadeV1Params>;
	credentials?: LcEmbeddingsLemonadeV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsLemonadeNode = LcEmbeddingsLemonadeV1Node;
