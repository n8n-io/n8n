/**
 * SerpApi (Google Search) Node - Version 1
 * Search in Google using SerpAPI
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

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
// Node Type
// ===========================================================================

export type LcToolSerpApiV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolSerpApi';
	version: 1;
	config: NodeConfig<LcToolSerpApiV1Params>;
	credentials?: LcToolSerpApiV1Credentials;
	isTrigger: true;
};