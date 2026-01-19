/**
 * Ollama Chat Model Node - Version 1
 * Language Model Ollama
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcLmChatOllamaV1Params {
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

export interface LcLmChatOllamaV1Credentials {
	ollamaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcLmChatOllamaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.lmChatOllama';
	version: 1;
	credentials?: LcLmChatOllamaV1Credentials;
	isTrigger: true;
}

export type LcLmChatOllamaV1ParamsNode = LcLmChatOllamaV1NodeBase & {
	config: NodeConfig<LcLmChatOllamaV1Params>;
};

export type LcLmChatOllamaV1Node = LcLmChatOllamaV1ParamsNode;