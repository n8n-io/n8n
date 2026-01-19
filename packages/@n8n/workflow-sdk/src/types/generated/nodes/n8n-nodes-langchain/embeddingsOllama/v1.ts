/**
 * Embeddings Ollama Node - Version 1
 * Use Ollama Embeddings
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOllamaV1Config {
/**
 * The model which will generate the completion. To download models, visit &lt;a href="https://ollama.ai/library"&gt;Ollama Models Library&lt;/a&gt;.
 * @default llama3.2
 */
		model: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcEmbeddingsOllamaV1Credentials {
	ollamaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcEmbeddingsOllamaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.embeddingsOllama';
	version: 1;
	credentials?: LcEmbeddingsOllamaV1Credentials;
	isTrigger: true;
}

export type LcEmbeddingsOllamaV1Node = LcEmbeddingsOllamaV1NodeBase & {
	config: NodeConfig<LcEmbeddingsOllamaV1Config>;
};

export type LcEmbeddingsOllamaV1Node = LcEmbeddingsOllamaV1Node;