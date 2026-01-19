/**
 * Embeddings Hugging Face Inference Node - Version 1
 * Use HuggingFace Inference Embeddings
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsHuggingFaceInferenceV1Config {
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

interface LcEmbeddingsHuggingFaceInferenceV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference';
	version: 1;
	credentials?: LcEmbeddingsHuggingFaceInferenceV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsHuggingFaceInferenceV1Node = LcEmbeddingsHuggingFaceInferenceV1NodeBase & {
	config: NodeConfig<LcEmbeddingsHuggingFaceInferenceV1Config>;
};

export type LcEmbeddingsHuggingFaceInferenceV1Node = LcEmbeddingsHuggingFaceInferenceV1Node;