/**
 * Reranker Cohere Node - Version 1
 * Use Cohere Reranker to reorder documents after retrieval from a vector store by relevance to the given query.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRerankerCohereV1Config {
/**
 * The model that should be used to rerank the documents. &lt;a href="https://docs.cohere.com/docs/models"&gt;Learn more&lt;/a&gt;.
 * @default rerank-v3.5
 */
		modelName?: 'rerank-v3.5' | 'rerank-english-v3.0' | 'rerank-multilingual-v3.0' | Expression<string>;
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
// Node Types
// ===========================================================================

interface LcRerankerCohereV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.rerankerCohere';
	version: 1;
	credentials?: LcRerankerCohereV1Credentials;
	isTrigger: true;
}

export type LcRerankerCohereV1Node = LcRerankerCohereV1NodeBase & {
	config: NodeConfig<LcRerankerCohereV1Config>;
};

export type LcRerankerCohereV1Node = LcRerankerCohereV1Node;