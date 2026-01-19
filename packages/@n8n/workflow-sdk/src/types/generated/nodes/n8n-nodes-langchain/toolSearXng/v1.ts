/**
 * SearXNG Node - Version 1
 * Search in SearXNG
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolSearXngV1Params {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcToolSearXngV1Credentials {
	searXngApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcToolSearXngV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolSearXng';
	version: 1;
	credentials?: LcToolSearXngV1Credentials;
	isTrigger: true;
}

export type LcToolSearXngV1ParamsNode = LcToolSearXngV1NodeBase & {
	config: NodeConfig<LcToolSearXngV1Params>;
};

export type LcToolSearXngV1Node = LcToolSearXngV1ParamsNode;