/**
 * Embeddings Ollama Node Types
 *
 * Use Ollama Embeddings
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/embeddingsollama/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOllamaV1Params {
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
// Node Type
// ===========================================================================

export type LcEmbeddingsOllamaNode = {
	type: '@n8n/n8n-nodes-langchain.embeddingsOllama';
	version: 1;
	config: NodeConfig<LcEmbeddingsOllamaV1Params>;
	credentials?: LcEmbeddingsOllamaV1Credentials;
	isTrigger: true;
};
