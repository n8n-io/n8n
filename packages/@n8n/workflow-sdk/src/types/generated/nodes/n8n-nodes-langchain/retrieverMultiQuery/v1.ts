/**
 * MultiQuery Retriever Node - Version 1
 * Automates prompt tuning, generates diverse queries and expands document pool for enhanced retrieval.
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
// Node Types
// ===========================================================================

interface LcRetrieverMultiQueryV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.retrieverMultiQuery';
	version: 1;
	isTrigger: true;
}

export type LcRetrieverMultiQueryV1ParamsNode = LcRetrieverMultiQueryV1NodeBase & {
	config: NodeConfig<LcRetrieverMultiQueryV1Params>;
};

export type LcRetrieverMultiQueryV1Node = LcRetrieverMultiQueryV1ParamsNode;