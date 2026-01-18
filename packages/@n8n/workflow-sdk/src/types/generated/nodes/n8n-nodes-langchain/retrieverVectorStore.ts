/**
 * Vector Store Retriever Node Types
 *
 * Use a Vector Store as Retriever
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/retrievervectorstore/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverVectorStoreV1Params {
	/**
	 * The maximum number of results to return
	 * @default 4
	 */
	topK?: number | Expression<number>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcRetrieverVectorStoreNode = {
	type: '@n8n/n8n-nodes-langchain.retrieverVectorStore';
	version: 1;
	config: NodeConfig<LcRetrieverVectorStoreV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
