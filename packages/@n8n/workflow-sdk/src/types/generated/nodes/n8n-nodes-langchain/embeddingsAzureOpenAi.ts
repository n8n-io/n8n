/**
 * Embeddings Azure OpenAI Node Types
 *
 * Use Embeddings Azure OpenAI
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingsazureopenai/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type LcEmbeddingsAzureOpenAiV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi';
	version: 1;
	config: NodeConfig<LcEmbeddingsAzureOpenAiV1Params>;
	credentials?: LcEmbeddingsAzureOpenAiV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsAzureOpenAiNode = LcEmbeddingsAzureOpenAiV1Node;
