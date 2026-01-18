/**
 * AWS Bedrock Chat Model Node Types
 *
 * Language Model AWS Bedrock
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatawsbedrock/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAwsBedrockV11Params {
	/**
	 * Choose between on-demand foundation models or inference profiles
	 * @default onDemand
	 */
	modelSource?: 'onDemand' | 'inferenceProfile' | Expression<string>;
	/**
	 * The model which will generate the completion. &lt;a href="https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models.html"&gt;Learn more&lt;/a&gt;.
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

export type LcLmChatAwsBedrockV11Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock';
	version: 1 | 1.1;
	config: NodeConfig<LcLmChatAwsBedrockV11Params>;
	credentials?: LcLmChatAwsBedrockV11Credentials;
	isTrigger: true;
};

export type LcLmChatAwsBedrockNode = LcLmChatAwsBedrockV11Node;
