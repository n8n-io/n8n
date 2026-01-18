/**
 * Vercel AI Gateway Chat Model Node Types
 *
 * For advanced usage with an AI chain via Vercel AI Gateway
 * @subnodeType ai_languageModel
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatvercelaigateway/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatVercelAiGatewayV1Params {
	/**
	 * The model which will generate the completion
	 * @default openai/gpt-4o
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

export interface LcLmChatVercelAiGatewayV1Credentials {
	vercelAiGatewayApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatVercelAiGatewayV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway';
	version: 1;
	config: NodeConfig<LcLmChatVercelAiGatewayV1Params>;
	credentials?: LcLmChatVercelAiGatewayV1Credentials;
	isTrigger: true;
};

export type LcLmChatVercelAiGatewayNode = LcLmChatVercelAiGatewayV1Node;
