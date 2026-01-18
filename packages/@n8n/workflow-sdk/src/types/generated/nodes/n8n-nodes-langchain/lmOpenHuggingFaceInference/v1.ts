/**
 * Hugging Face Inference Model Node - Version 1
 * Language Model HuggingFaceInference
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type LcLmOpenHuggingFaceInferenceV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference';
	version: 1;
	config: NodeConfig<LcLmOpenHuggingFaceInferenceV1Params>;
	credentials?: LcLmOpenHuggingFaceInferenceV1Credentials;
	isTrigger: true;
};