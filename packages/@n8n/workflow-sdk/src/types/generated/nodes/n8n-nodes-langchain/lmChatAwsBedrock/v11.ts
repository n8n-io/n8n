/**
 * AWS Bedrock Chat Model Node - Version 1.1
 * Language Model AWS Bedrock
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAwsBedrockV11Params {
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

export interface LcLmChatAwsBedrockV11Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatAwsBedrockV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock';
	version: 1.1;
	credentials?: LcLmChatAwsBedrockV11Credentials;
	isTrigger: true;
}

export type LcLmChatAwsBedrockV11ParamsNode = LcLmChatAwsBedrockV11NodeBase & {
	config: NodeConfig<LcLmChatAwsBedrockV11Params>;
};

export type LcLmChatAwsBedrockV11Node = LcLmChatAwsBedrockV11ParamsNode;