/**
 * Embeddings Hugging Face Inference Node Types
 *
 * Use HuggingFace Inference Embeddings
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingshuggingfaceinference/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsHuggingFaceInferenceV1Params {
	/**
	 * The model name to use from HuggingFace library
	 * @default sentence-transformers/distilbert-base-nli-mean-tokens
	 */
	modelName?: string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsHuggingFaceInferenceV1Credentials {
	huggingFaceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcEmbeddingsHuggingFaceInferenceV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference';
	version: 1;
	config: NodeConfig<LcEmbeddingsHuggingFaceInferenceV1Params>;
	credentials?: LcEmbeddingsHuggingFaceInferenceV1Credentials;
	isTrigger: true;
};

export type LcEmbeddingsHuggingFaceInferenceNode = LcEmbeddingsHuggingFaceInferenceV1Node;
