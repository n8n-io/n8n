/**
 * MultiQuery Retriever Node Types
 *
 * Automates prompt tuning, generates diverse queries and expands document pool for enhanced retrieval.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/retrievermultiquery/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

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
// Node Types
// ===========================================================================

export type LcRetrieverMultiQueryV1Node = {
	type: '@n8n/n8n-nodes-langchain.retrieverMultiQuery';
	version: 1;
	config: NodeConfig<LcRetrieverMultiQueryV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcRetrieverMultiQueryNode = LcRetrieverMultiQueryV1Node;
