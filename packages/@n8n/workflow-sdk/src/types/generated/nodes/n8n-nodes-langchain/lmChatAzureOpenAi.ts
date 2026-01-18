/**
 * Azure OpenAI Chat Model Node Types
 *
 * For advanced usage with an AI chain
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatazureopenai/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatAzureOpenAiV1Params {
	authentication?: 'azureOpenAiApi' | 'azureEntraCognitiveServicesOAuth2Api' | Expression<string>;
	/**
	 * The name of the model(deployment) to use (e.g., gpt-4, gpt-35-turbo)
	 */
	model: string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatAzureOpenAiV1Credentials {
	azureOpenAiApi: CredentialReference;
	azureEntraCognitiveServicesOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatAzureOpenAiV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi';
	version: 1;
	config: NodeConfig<LcLmChatAzureOpenAiV1Params>;
	credentials?: LcLmChatAzureOpenAiV1Credentials;
	isTrigger: true;
};

export type LcLmChatAzureOpenAiNode = LcLmChatAzureOpenAiV1Node;
