/**
 * Mistral Cloud Chat Model Node - Version 1
 * For advanced usage with an AI chain
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatMistralCloudV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.mistral.ai/platform/endpoints/"&gt;Learn more&lt;/a&gt;.
 * @default mistral-small
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

export interface LcLmChatMistralCloudV1Credentials {
	mistralCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatMistralCloudV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud';
	version: 1;
	credentials?: LcLmChatMistralCloudV1Credentials;
	isTrigger: true;
}

export type LcLmChatMistralCloudV1ParamsNode = LcLmChatMistralCloudV1NodeBase & {
	config: NodeConfig<LcLmChatMistralCloudV1Params>;
};

export type LcLmChatMistralCloudV1Node = LcLmChatMistralCloudV1ParamsNode;