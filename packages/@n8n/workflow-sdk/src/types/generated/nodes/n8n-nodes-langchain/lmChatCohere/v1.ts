/**
 * Cohere Chat Model Node - Version 1
 * For advanced usage with an AI chain
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatCohereV1Params {
/**
 * The model which will generate the completion. &lt;a href="https://docs.cohere.com/docs/models"&gt;Learn more&lt;/a&gt;.
 * @default command-a-03-2025
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

export interface LcLmChatCohereV1Credentials {
	cohereApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatCohereV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatCohere';
	version: 1;
	credentials?: LcLmChatCohereV1Credentials;
	isTrigger: true;
}

export type LcLmChatCohereV1ParamsNode = LcLmChatCohereV1NodeBase & {
	config: NodeConfig<LcLmChatCohereV1Params>;
};

export type LcLmChatCohereV1Node = LcLmChatCohereV1ParamsNode;