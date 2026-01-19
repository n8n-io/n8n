/**
 * Embeddings OpenAI Node - Version 1.2
 * Use Embeddings OpenAI
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOpenAiV12Config {
/**
 * The model which will generate the embeddings. &lt;a href="https://platform.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
 * @default text-embedding-3-small
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

export interface LcEmbeddingsOpenAiV12Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcEmbeddingsOpenAiV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi';
	version: 1.2;
	credentials?: LcEmbeddingsOpenAiV12Credentials;
	isTrigger: true;
}

export type LcEmbeddingsOpenAiV12Node = LcEmbeddingsOpenAiV12NodeBase & {
	config: NodeConfig<LcEmbeddingsOpenAiV12Config>;
};

export type LcEmbeddingsOpenAiV12Node = LcEmbeddingsOpenAiV12Node;