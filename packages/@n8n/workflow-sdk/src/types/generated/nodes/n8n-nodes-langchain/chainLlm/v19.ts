/**
 * Basic LLM Chain Node - Version 1.9
 * A simple chain to prompt a large language model
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainLlmV19AutoConfig = {
	promptType: 'auto';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: {
		messageValues?: Array<{
			/** Type Name or ID
			 * @default SystemMessagePromptTemplate
			 */
			type?: 'AIMessagePromptTemplate' | 'SystemMessagePromptTemplate' | 'HumanMessagePromptTemplate' | Expression<string>;
			/** Message Type
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"] }
			 * @default text
			 */
			messageType?: 'text' | 'imageBinary' | 'imageUrl' | Expression<string>;
			/** The name of the field in the chain's input that contains the binary image file to be processed
			 * @displayOptions.show { messageType: ["imageBinary"] }
			 * @default data
			 */
			binaryImageDataKey?: string | Expression<string>;
			/** URL to the image to be processed
			 * @displayOptions.show { messageType: ["imageUrl"] }
			 */
			imageUrl?: string | Expression<string>;
			/** Control how the model processes the image and generates its textual understanding
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"], messageType: ["imageBinary", "imageUrl"] }
			 * @default auto
			 */
			imageDetail?: 'auto' | 'low' | 'high' | Expression<string>;
			/** Message
			 * @displayOptions.hide { messageType: ["imageBinary", "imageUrl"] }
			 */
			message?: string | Expression<string>;
		}>;
	};
/**
 * Batch processing options for rate limiting
 * @displayOptions.show { @version: [{"_cnd":{"gte":1.7}}] }
 * @default {}
 */
		batching?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainLlmV19GuardrailsConfig = {
	promptType: 'guardrails';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: {
		messageValues?: Array<{
			/** Type Name or ID
			 * @default SystemMessagePromptTemplate
			 */
			type?: 'AIMessagePromptTemplate' | 'SystemMessagePromptTemplate' | 'HumanMessagePromptTemplate' | Expression<string>;
			/** Message Type
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"] }
			 * @default text
			 */
			messageType?: 'text' | 'imageBinary' | 'imageUrl' | Expression<string>;
			/** The name of the field in the chain's input that contains the binary image file to be processed
			 * @displayOptions.show { messageType: ["imageBinary"] }
			 * @default data
			 */
			binaryImageDataKey?: string | Expression<string>;
			/** URL to the image to be processed
			 * @displayOptions.show { messageType: ["imageUrl"] }
			 */
			imageUrl?: string | Expression<string>;
			/** Control how the model processes the image and generates its textual understanding
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"], messageType: ["imageBinary", "imageUrl"] }
			 * @default auto
			 */
			imageDetail?: 'auto' | 'low' | 'high' | Expression<string>;
			/** Message
			 * @displayOptions.hide { messageType: ["imageBinary", "imageUrl"] }
			 */
			message?: string | Expression<string>;
		}>;
	};
/**
 * Batch processing options for rate limiting
 * @displayOptions.show { @version: [{"_cnd":{"gte":1.7}}] }
 * @default {}
 */
		batching?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainLlmV19DefineConfig = {
	promptType: 'define';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: {
		messageValues?: Array<{
			/** Type Name or ID
			 * @default SystemMessagePromptTemplate
			 */
			type?: 'AIMessagePromptTemplate' | 'SystemMessagePromptTemplate' | 'HumanMessagePromptTemplate' | Expression<string>;
			/** Message Type
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"] }
			 * @default text
			 */
			messageType?: 'text' | 'imageBinary' | 'imageUrl' | Expression<string>;
			/** The name of the field in the chain's input that contains the binary image file to be processed
			 * @displayOptions.show { messageType: ["imageBinary"] }
			 * @default data
			 */
			binaryImageDataKey?: string | Expression<string>;
			/** URL to the image to be processed
			 * @displayOptions.show { messageType: ["imageUrl"] }
			 */
			imageUrl?: string | Expression<string>;
			/** Control how the model processes the image and generates its textual understanding
			 * @displayOptions.show { type: ["HumanMessagePromptTemplate"], messageType: ["imageBinary", "imageUrl"] }
			 * @default auto
			 */
			imageDetail?: 'auto' | 'low' | 'high' | Expression<string>;
			/** Message
			 * @displayOptions.hide { messageType: ["imageBinary", "imageUrl"] }
			 */
			message?: string | Expression<string>;
		}>;
	};
/**
 * Batch processing options for rate limiting
 * @displayOptions.show { @version: [{"_cnd":{"gte":1.7}}] }
 * @default {}
 */
		batching?: Record<string, unknown>;
};

export type LcChainLlmV19Params =
	| LcChainLlmV19AutoConfig
	| LcChainLlmV19GuardrailsConfig
	| LcChainLlmV19DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainLlmV19Node = {
	type: '@n8n/n8n-nodes-langchain.chainLlm';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | 1.7 | 1.8 | 1.9;
	config: NodeConfig<LcChainLlmV19Params>;
	credentials?: Record<string, never>;
};