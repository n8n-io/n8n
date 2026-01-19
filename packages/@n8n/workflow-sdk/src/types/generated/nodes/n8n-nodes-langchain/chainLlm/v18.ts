/**
 * Basic LLM Chain Node - Version 1.8
 * A simple chain to prompt a large language model
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainLlmV18AutoConfig = {
	promptType: 'auto';
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
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainLlmV18GuardrailsConfig = {
	promptType: 'guardrails';
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
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainLlmV18DefineConfig = {
	promptType: 'define';
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
};

export type LcChainLlmV18Params =
	| LcChainLlmV18AutoConfig
	| LcChainLlmV18GuardrailsConfig
	| LcChainLlmV18DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainLlmV18NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainLlm';
	version: 1.8;
}

export type LcChainLlmV18AutoNode = LcChainLlmV18NodeBase & {
	config: NodeConfig<LcChainLlmV18AutoConfig>;
};

export type LcChainLlmV18GuardrailsNode = LcChainLlmV18NodeBase & {
	config: NodeConfig<LcChainLlmV18GuardrailsConfig>;
};

export type LcChainLlmV18DefineNode = LcChainLlmV18NodeBase & {
	config: NodeConfig<LcChainLlmV18DefineConfig>;
};

export type LcChainLlmV18Node =
	| LcChainLlmV18AutoNode
	| LcChainLlmV18GuardrailsNode
	| LcChainLlmV18DefineNode
	;