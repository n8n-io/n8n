/**
 * Cohere Chat Model Node Types
 *
 * For advanced usage with an AI chain
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatcohere/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type LcLmChatCohereV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatCohere';
	version: 1;
	config: NodeConfig<LcLmChatCohereV1Params>;
	credentials?: LcLmChatCohereV1Credentials;
	isTrigger: true;
};

export type LcLmChatCohereNode = LcLmChatCohereV1Node;
