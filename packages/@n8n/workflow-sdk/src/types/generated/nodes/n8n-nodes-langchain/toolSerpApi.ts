/**
 * SerpApi (Google Search) Node Types
 *
 * Search in Google using SerpAPI
 * @subnodeType ai_tool
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolserpapi/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolSerpApiV1Params {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcToolSerpApiV1Credentials {
	serpApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcToolSerpApiV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolSerpApi';
	version: 1;
	config: NodeConfig<LcToolSerpApiV1Params>;
	credentials?: LcToolSerpApiV1Credentials;
	isTrigger: true;
};

export type LcToolSerpApiNode = LcToolSerpApiV1Node;
