/**
 * Embeddings OpenAI Node - Version 1.2
 * Use Embeddings OpenAI
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcEmbeddingsOpenAiV12Params {
/**
 * The model which will generate the embeddings. &lt;a href="https://platform.openai.com/docs/models/overview"&gt;Learn more&lt;/a&gt;.
 * @displayOptions.show { @version: [1] }
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

export interface LcEmbeddingsOpenAiV12Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcEmbeddingsOpenAiV12Node = {
	type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<LcEmbeddingsOpenAiV12Params>;
	credentials?: LcEmbeddingsOpenAiV12Credentials;
	isTrigger: true;
};