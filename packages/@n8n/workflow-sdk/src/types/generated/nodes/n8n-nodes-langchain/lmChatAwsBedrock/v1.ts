/**
 * AWS Bedrock Chat Model Node - Version 1
 * Language Model AWS Bedrock
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAwsBedrockV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.hide { modelSource: ["inferenceProfile"] }
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

export interface LcLmChatAwsBedrockV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatAwsBedrockV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock';
	version: 1;
	credentials?: LcLmChatAwsBedrockV1Credentials;
	isTrigger: true;
}

export type LcLmChatAwsBedrockV1ParamsNode = LcLmChatAwsBedrockV1NodeBase & {
	config: NodeConfig<LcLmChatAwsBedrockV1Params>;
};

export type LcLmChatAwsBedrockV1Node = LcLmChatAwsBedrockV1ParamsNode;