/**
 * Hugging Face Inference Model Node - Version 1
 * Language Model HuggingFaceInference
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmOpenHuggingFaceInferenceV1Params {
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

export interface LcLmOpenHuggingFaceInferenceV1Credentials {
	huggingFaceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmOpenHuggingFaceInferenceV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference';
	version: 1;
	credentials?: LcLmOpenHuggingFaceInferenceV1Credentials;
	isTrigger: true;
}

export type LcLmOpenHuggingFaceInferenceV1ParamsNode = LcLmOpenHuggingFaceInferenceV1NodeBase & {
	config: NodeConfig<LcLmOpenHuggingFaceInferenceV1Params>;
};

export type LcLmOpenHuggingFaceInferenceV1Node = LcLmOpenHuggingFaceInferenceV1ParamsNode;