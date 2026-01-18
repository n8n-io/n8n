/**
 * Vector Store Question Answer Tool Node - Version 1.1
 * Answer questions with a vector store
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolVectorStoreV11Params {
/**
 * Name of the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.
 * @displayOptions.show { @version: [1] }
 */
		name?: string | Expression<string>;
/**
 * Describe the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.
 */
		description?: string | Expression<string>;
/**
 * The maximum number of results to return
 * @default 4
 */
		topK?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcToolVectorStoreV11Node = {
	type: '@n8n/n8n-nodes-langchain.toolVectorStore';
	version: 1 | 1.1;
	config: NodeConfig<LcToolVectorStoreV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};