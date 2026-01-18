/**
 * Ollama Node Types
 *
 * Interact with Ollama AI models
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ollama/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Take in images and answer questions about them */
export type LcOllamaV1ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'binary' | 'url' | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the image(s), separate multiple field names with commas
	 * @hint The name of the input field containing the binary file data to be processed
	 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["image"] }
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma
	 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["image"] }
	 */
	imageUrls?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @displayOptions.show { operation: ["analyze"], resource: ["image"] }
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Send a message to Ollama model */
export type LcOllamaV1TextMessageConfig = {
	resource: 'text';
	operation: 'message';
	modelId: ResourceLocatorValue;
	messages?: {
		values?: Array<{
			/** The content of the message to be sent
			 */
			content?: string | Expression<string>;
			/** The role of this message in the conversation
			 * @default user
			 */
			role?: 'user' | 'assistant' | Expression<string>;
		}>;
	};
	/**
	 * Whether to simplify the response or not
	 * @displayOptions.show { operation: ["message"], resource: ["text"] }
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type LcOllamaV1Params = LcOllamaV1ImageAnalyzeConfig | LcOllamaV1TextMessageConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcOllamaV1Credentials {
	ollamaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcOllamaV1Node = {
	type: '@n8n/n8n-nodes-langchain.ollama';
	version: 1;
	config: NodeConfig<LcOllamaV1Params>;
	credentials?: LcOllamaV1Credentials;
};

export type LcOllamaNode = LcOllamaV1Node;
