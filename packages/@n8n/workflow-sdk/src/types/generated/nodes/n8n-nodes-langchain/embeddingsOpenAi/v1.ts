/**
 * Embeddings OpenAI Node - Version 1
 * Use Embeddings OpenAI
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOpenAiV1Params {
/**
 * The model which will generate the embeddings. &lt;a href="https://platform.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
 * @default text-embedding-ada-002
 */
		model?: string | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsOpenAiV1Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcEmbeddingsOpenAiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi';
	version: 1;
	credentials?: LcEmbeddingsOpenAiV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsOpenAiV1ParamsNode = LcEmbeddingsOpenAiV1NodeBase & {
	config: NodeConfig<LcEmbeddingsOpenAiV1Params>;
};

export type LcEmbeddingsOpenAiV1Node = LcEmbeddingsOpenAiV1ParamsNode;