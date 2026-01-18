/**
 * Reranker Cohere Node Types
 *
 * Use Cohere Reranker to reorder documents after retrieval from a vector store by relevance to the given query.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rerankercohere/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRerankerCohereV1Params {
	/**
	 * The model that should be used to rerank the documents. &lt;a href="https://docs.cohere.com/docs/models"&gt;Learn more&lt;/a&gt;.
	 * @default rerank-v3.5
	 */
	modelName?:
		| 'rerank-v3.5'
		| 'rerank-english-v3.0'
		| 'rerank-multilingual-v3.0'
		| Expression<string>;
	/**
	 * The maximum number of documents to return after reranking
	 * @default 3
	 */
	topN?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcRerankerCohereV1Credentials {
	cohereApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcRerankerCohereNode = {
	type: '@n8n/n8n-nodes-langchain.rerankerCohere';
	version: 1;
	config: NodeConfig<LcRerankerCohereV1Params>;
	credentials?: LcRerankerCohereV1Credentials;
	isTrigger: true;
};
