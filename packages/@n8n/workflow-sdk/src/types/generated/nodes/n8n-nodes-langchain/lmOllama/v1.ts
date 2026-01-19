/**
 * Ollama Model Node - Version 1
 * Language Model Ollama
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmOllamaV1Params {
/**
 * The model which will generate the completion. To download models, visit &lt;a href="https://ollama.ai/library"&gt;Ollama Models Library&lt;/a&gt;.
 * @default llama3.2
 */
		model: string | Expression<string>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcLmOllamaV1Credentials {
	ollamaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmOllamaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmOllama';
	version: 1;
	credentials?: LcLmOllamaV1Credentials;
	isTrigger: true;
}

export type LcLmOllamaV1ParamsNode = LcLmOllamaV1NodeBase & {
	config: NodeConfig<LcLmOllamaV1Params>;
};

export type LcLmOllamaV1Node = LcLmOllamaV1ParamsNode;