/**
 * Basic LLM Chain Node - Version 1.2
 * A simple chain to prompt a large language model
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainLlmV12AutoConfig = {
	promptType: 'auto';
	prompt: string | Expression<string>;
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
export type LcChainLlmV12GuardrailsConfig = {
	promptType: 'guardrails';
	prompt: string | Expression<string>;
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
export type LcChainLlmV12DefineConfig = {
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
};


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainLlmV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainLlm';
	version: 1.2;
}

export type LcChainLlmV12AutoNode = LcChainLlmV12NodeBase & {
	config: NodeConfig<LcChainLlmV12AutoConfig>;
};

export type LcChainLlmV12GuardrailsNode = LcChainLlmV12NodeBase & {
	config: NodeConfig<LcChainLlmV12GuardrailsConfig>;
};

export type LcChainLlmV12DefineNode = LcChainLlmV12NodeBase & {
	config: NodeConfig<LcChainLlmV12DefineConfig>;
};

export type LcChainLlmV12Node =
	| LcChainLlmV12AutoNode
	| LcChainLlmV12GuardrailsNode
	| LcChainLlmV12DefineNode
	;