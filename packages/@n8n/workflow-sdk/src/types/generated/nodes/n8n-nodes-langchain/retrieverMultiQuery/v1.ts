/**
 * MultiQuery Retriever Node - Version 1
 * Automates prompt tuning, generates diverse queries and expands document pool for enhanced retrieval.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverMultiQueryV1Params {
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcRetrieverMultiQueryV1Node = {
	type: '@n8n/n8n-nodes-langchain.retrieverMultiQuery';
	version: 1;
	config: NodeConfig<LcRetrieverMultiQueryV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};