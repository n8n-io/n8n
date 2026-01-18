/**
 * Google Vertex Chat Model Node Types
 *
 * Chat Model Google Vertex
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatgooglevertex/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatGoogleVertexV1Params {
	/**
	 * Select or enter your Google Cloud project ID
	 * @default {"mode":"list","value":""}
	 */
	projectId: ResourceLocatorValue;
	/**
	 * The model which will generate the completion. &lt;a href="https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models"&gt;Learn more&lt;/a&gt;.
	 * @default gemini-2.5-flash
	 */
	modelName?: string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmChatGoogleVertexV1Credentials {
	googleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcLmChatGoogleVertexV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatGoogleVertex';
	version: 1;
	config: NodeConfig<LcLmChatGoogleVertexV1Params>;
	credentials?: LcLmChatGoogleVertexV1Credentials;
	isTrigger: true;
};

export type LcLmChatGoogleVertexNode = LcLmChatGoogleVertexV1Node;
