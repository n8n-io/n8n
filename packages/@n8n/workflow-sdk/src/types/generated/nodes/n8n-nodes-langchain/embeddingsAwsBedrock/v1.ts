/**
 * Embeddings AWS Bedrock Node - Version 1
 * Use Embeddings AWS Bedrock
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsAwsBedrockV1Config {
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
// Node Types
// ===========================================================================

interface LcEmbeddingsAwsBedrockV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsAwsBedrock';
	version: 1;
	credentials?: LcEmbeddingsAwsBedrockV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsAwsBedrockV1Node = LcEmbeddingsAwsBedrockV1NodeBase & {
	config: NodeConfig<LcEmbeddingsAwsBedrockV1Config>;
};

export type LcEmbeddingsAwsBedrockV1Node = LcEmbeddingsAwsBedrockV1Node;