/**
 * Embeddings Azure OpenAI Node - Version 1
 * Use Embeddings Azure OpenAI
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsAzureOpenAiV1Params {
/**
 * The name of the model(deployment) to use
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

export interface LcEmbeddingsAzureOpenAiV1Credentials {
	azureOpenAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcEmbeddingsAzureOpenAiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi';
	version: 1;
	credentials?: LcEmbeddingsAzureOpenAiV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsAzureOpenAiV1ParamsNode = LcEmbeddingsAzureOpenAiV1NodeBase & {
	config: NodeConfig<LcEmbeddingsAzureOpenAiV1Params>;
};

export type LcEmbeddingsAzureOpenAiV1Node = LcEmbeddingsAzureOpenAiV1ParamsNode;