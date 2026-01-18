/**
 * Ollama Chat Model Node Types
 *
 * Language Model Ollama
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lmchatollama/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type LcLmChatOllamaV1Node = {
	type: '@n8n/n8n-nodes-langchain.lmChatOllama';
	version: 1;
	config: NodeConfig<LcLmChatOllamaV1Params>;
	credentials?: LcLmChatOllamaV1Credentials;
	isTrigger: true;
};

export type LcLmChatOllamaNode = LcLmChatOllamaV1Node;
