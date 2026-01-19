/**
 * SerpApi (Google Search) Node - Version 1
 * Search in Google using SerpAPI
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
// Node Types
// ===========================================================================

interface LcToolSerpApiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolSerpApi';
	version: 1;
	credentials?: LcToolSerpApiV1Credentials;
	isTrigger: true;
}

export type LcToolSerpApiV1ParamsNode = LcToolSerpApiV1NodeBase & {
	config: NodeConfig<LcToolSerpApiV1Params>;
};

export type LcToolSerpApiV1Node = LcToolSerpApiV1ParamsNode;