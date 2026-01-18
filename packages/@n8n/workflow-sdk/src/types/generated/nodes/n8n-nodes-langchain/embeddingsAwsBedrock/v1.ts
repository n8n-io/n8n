/**
 * Embeddings AWS Bedrock Node - Version 1
 * Use Embeddings AWS Bedrock
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsAwsBedrockV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html"&gt;Learn more&lt;/a&gt;.
 */
		model?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsAwsBedrockV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcEmbeddingsAwsBedrockV1Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsAwsBedrock';
	version: 1;
	config: NodeConfig<LcEmbeddingsAwsBedrockV1Params>;
	credentials?: LcEmbeddingsAwsBedrockV1Credentials;
	isTrigger: true;
};