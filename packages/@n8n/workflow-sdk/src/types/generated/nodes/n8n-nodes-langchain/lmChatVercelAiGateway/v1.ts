/**
 * Vercel AI Gateway Chat Model Node - Version 1
 * For advanced usage with an AI chain via Vercel AI Gateway
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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

interface LcLmChatVercelAiGatewayV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway';
	version: 1;
	credentials?: LcLmChatVercelAiGatewayV1Credentials;
	isTrigger: true;
}

export type LcLmChatVercelAiGatewayV1ParamsNode = LcLmChatVercelAiGatewayV1NodeBase & {
	config: NodeConfig<LcLmChatVercelAiGatewayV1Params>;
};

export type LcLmChatVercelAiGatewayV1Node = LcLmChatVercelAiGatewayV1ParamsNode;