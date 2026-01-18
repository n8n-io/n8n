/**
 * SearXNG Node - Version 1
 * Search in SearXNG
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type LcToolSearXngV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolSearXng';
	version: 1;
	config: NodeConfig<LcToolSearXngV1Params>;
	credentials?: LcToolSearXngV1Credentials;
	isTrigger: true;
};