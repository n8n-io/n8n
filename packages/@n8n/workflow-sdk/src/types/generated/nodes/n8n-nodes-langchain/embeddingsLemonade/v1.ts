/**
 * Embeddings Lemonade Node - Version 1
 * Use Lemonade Embeddings
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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

interface LcEmbeddingsLemonadeV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsLemonade';
	version: 1;
	credentials?: LcEmbeddingsLemonadeV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsLemonadeV1ParamsNode = LcEmbeddingsLemonadeV1NodeBase & {
	config: NodeConfig<LcEmbeddingsLemonadeV1Params>;
};

export type LcEmbeddingsLemonadeV1Node = LcEmbeddingsLemonadeV1ParamsNode;