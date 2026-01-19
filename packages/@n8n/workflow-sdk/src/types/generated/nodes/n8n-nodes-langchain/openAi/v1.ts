/**
 * OpenAI Node - Version 1
 * Message an assistant or GPT, analyze images, generate audio, etc.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new assistant */
export type LcOpenAiV1AssistantCreateConfig = {
	resource: 'assistant';
	operation: 'create';
	modelId: ResourceLocatorValue;
/**
 * The name of the assistant. The maximum length is 256 characters.
 * @displayOptions.show { operation: ["create"], resource: ["assistant"] }
 */
		name: string | Expression<string>;
/**
 * The description of the assistant. The maximum length is 512 characters.
 * @displayOptions.show { operation: ["create"], resource: ["assistant"] }
 */
		description?: string | Expression<string>;
/**
 * The system instructions that the assistant uses. The maximum length is 32768 characters.
 * @displayOptions.show { operation: ["create"], resource: ["assistant"] }
 */
		instructions?: string | Expression<string>;
/**
 * Whether to enable the code interpreter that allows the assistants to write and run Python code in a sandboxed execution environment, find more &lt;a href="https://platform.openai.com/docs/assistants/tools/code-interpreter" target="_blank"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["assistant"] }
 * @default false
 */
		codeInterpreter?: boolean | Expression<boolean>;
/**
 * Whether to augments the assistant with knowledge from outside its model, such as proprietary product information or documents, find more &lt;a href="https://platform.openai.com/docs/assistants/tools/knowledge-retrieval" target="_blank"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["assistant"] }
 * @default false
 */
		knowledgeRetrieval?: boolean | Expression<boolean>;
/**
 * The files to be used by the assistant, there can be a maximum of 20 files attached to the assistant. You can use expression to pass file IDs as an array or comma-separated string.
 * @hint Add more files by using the 'Upload a File' operation
 * @displayOptions.show { codeInterpreter: [true], operation: ["create"], resource: ["assistant"] }
 * @displayOptions.hide { knowledgeRetrieval: [true] }
 * @default []
 */
		file_ids?: string[];
	options?: Record<string, unknown>;
};

/** Delete an assistant from the account */
export type LcOpenAiV1AssistantDeleteAssistantConfig = {
	resource: 'assistant';
	operation: 'deleteAssistant';
/**
 * Assistant to respond to the message. You can add, modify or remove assistants in the &lt;a href="https://platform.openai.com/playground?mode=assistant" target="_blank"&gt;playground&lt;/a&gt;.
 * @displayOptions.show { operation: ["deleteAssistant"], resource: ["assistant"] }
 * @default {"mode":"list","value":""}
 */
		assistantId: ResourceLocatorValue;
};

/** List assistants in the organization */
export type LcOpenAiV1AssistantListConfig = {
	resource: 'assistant';
	operation: 'list';
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["list"], resource: ["assistant"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
};

/** Send messages to an assistant */
export type LcOpenAiV1AssistantMessageConfig = {
	resource: 'assistant';
	operation: 'message';
/**
 * Assistant to respond to the message. You can add, modify or remove assistants in the &lt;a href="https://platform.openai.com/playground?mode=assistant" target="_blank"&gt;playground&lt;/a&gt;.
 * @displayOptions.show { operation: ["message"], resource: ["assistant"] }
 * @default {"mode":"list","value":""}
 */
		assistantId: ResourceLocatorValue;
	prompt?: 'auto' | 'guardrails' | 'define' | Expression<string>;
	text?: string | Expression<string>;
/**
 * Additional options to add
 * @displayOptions.show { operation: ["message"], resource: ["assistant"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

/** Update an existing assistant */
export type LcOpenAiV1AssistantUpdateConfig = {
	resource: 'assistant';
	operation: 'update';
/**
 * Assistant to respond to the message. You can add, modify or remove assistants in the &lt;a href="https://platform.openai.com/playground?mode=assistant" target="_blank"&gt;playground&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["assistant"] }
 * @default {"mode":"list","value":""}
 */
		assistantId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Send messages to an assistant */
export type LcOpenAiV1TextMessageConfig = {
	resource: 'text';
	operation: 'message';
	modelId: ResourceLocatorValue;
	messages?: {
		values?: Array<{
			/** The content of the message to be send
			 */
			content?: string | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | 'system' | Expression<string>;
		}>;
	};
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to attempt to return the response in JSON format. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106.
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default false
 */
		jsonOutput?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Check whether content complies with usage policies */
export type LcOpenAiV1TextClassifyConfig = {
	resource: 'text';
	operation: 'classify';
/**
 * The input text to classify if it is violates the moderation policy
 * @displayOptions.show { operation: ["classify"], resource: ["text"] }
 */
		input?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["classify"], resource: ["text"] }
 * @default false
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Take in images and answer questions about them */
export type LcOpenAiV1ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	text?: string | Expression<string>;
	inputType?: 'url' | 'base64' | Expression<string>;
/**
 * URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["image"] }
 */
		imageUrls?: string | Expression<string>;
/**
 * Name of the binary property which contains the image(s)
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["base64"], operation: ["analyze"], resource: ["image"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["image"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Creates audio from a text prompt */
export type LcOpenAiV1ImageGenerateConfig = {
	resource: 'image';
	operation: 'generate';
/**
 * The model to use for image generation
 * @displayOptions.show { operation: ["generate"], resource: ["image"] }
 * @default dall-e-3
 */
		model?: 'dall-e-2' | 'dall-e-3' | 'gpt-image-1' | Expression<string>;
/**
 * A text description of the desired image(s). The maximum length is 1000 characters for dall-e-2 and 4000 characters for dall-e-3.
 * @displayOptions.show { operation: ["generate"], resource: ["image"] }
 */
		prompt?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Creates audio from a text prompt */
export type LcOpenAiV1AudioGenerateConfig = {
	resource: 'audio';
	operation: 'generate';
	model?: 'tts-1' | 'tts-1-hd' | Expression<string>;
/**
 * The text to generate audio for. The maximum length is 4096 characters.
 * @displayOptions.show { operation: ["generate"], resource: ["audio"] }
 */
		input?: string | Expression<string>;
/**
 * The voice to use when generating the audio
 * @displayOptions.show { operation: ["generate"], resource: ["audio"] }
 * @default alloy
 */
		voice?: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Transcribes audio into text */
export type LcOpenAiV1AudioTranscribeConfig = {
	resource: 'audio';
	operation: 'transcribe';
/**
 * Name of the binary property which contains the audio file in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { operation: ["transcribe"], resource: ["audio"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Translates audio into text in English */
export type LcOpenAiV1AudioTranslateConfig = {
	resource: 'audio';
	operation: 'translate';
/**
 * Name of the binary property which contains the audio file in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { operation: ["translate"], resource: ["audio"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a file from the server */
export type LcOpenAiV1FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
	fileId: ResourceLocatorValue;
};

/** List assistants in the organization */
export type LcOpenAiV1FileListConfig = {
	resource: 'file';
	operation: 'list';
	options?: Record<string, unknown>;
};

/** Upload a file that can be used across various endpoints */
export type LcOpenAiV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * Name of the binary property which contains the file. The size of individual files can be a maximum of 512 MB or 2 million tokens for Assistants.
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcOpenAiV1Params =
	| LcOpenAiV1AssistantCreateConfig
	| LcOpenAiV1AssistantDeleteAssistantConfig
	| LcOpenAiV1AssistantListConfig
	| LcOpenAiV1AssistantMessageConfig
	| LcOpenAiV1AssistantUpdateConfig
	| LcOpenAiV1TextMessageConfig
	| LcOpenAiV1TextClassifyConfig
	| LcOpenAiV1ImageAnalyzeConfig
	| LcOpenAiV1ImageGenerateConfig
	| LcOpenAiV1AudioGenerateConfig
	| LcOpenAiV1AudioTranscribeConfig
	| LcOpenAiV1AudioTranslateConfig
	| LcOpenAiV1FileDeleteFileConfig
	| LcOpenAiV1FileListConfig
	| LcOpenAiV1FileUploadConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcOpenAiV1Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcOpenAiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.openAi';
	version: 1;
	credentials?: LcOpenAiV1Credentials;
}

export type LcOpenAiV1AssistantCreateNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AssistantCreateConfig>;
};

export type LcOpenAiV1AssistantDeleteAssistantNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AssistantDeleteAssistantConfig>;
};

export type LcOpenAiV1AssistantListNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AssistantListConfig>;
};

export type LcOpenAiV1AssistantMessageNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AssistantMessageConfig>;
};

export type LcOpenAiV1AssistantUpdateNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AssistantUpdateConfig>;
};

export type LcOpenAiV1TextMessageNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1TextMessageConfig>;
};

export type LcOpenAiV1TextClassifyNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1TextClassifyConfig>;
};

export type LcOpenAiV1ImageAnalyzeNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1ImageAnalyzeConfig>;
};

export type LcOpenAiV1ImageGenerateNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1ImageGenerateConfig>;
};

export type LcOpenAiV1AudioGenerateNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AudioGenerateConfig>;
};

export type LcOpenAiV1AudioTranscribeNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AudioTranscribeConfig>;
};

export type LcOpenAiV1AudioTranslateNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1AudioTranslateConfig>;
};

export type LcOpenAiV1FileDeleteFileNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1FileDeleteFileConfig>;
};

export type LcOpenAiV1FileListNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1FileListConfig>;
};

export type LcOpenAiV1FileUploadNode = LcOpenAiV1NodeBase & {
	config: NodeConfig<LcOpenAiV1FileUploadConfig>;
};

export type LcOpenAiV1Node =
	| LcOpenAiV1AssistantCreateNode
	| LcOpenAiV1AssistantDeleteAssistantNode
	| LcOpenAiV1AssistantListNode
	| LcOpenAiV1AssistantMessageNode
	| LcOpenAiV1AssistantUpdateNode
	| LcOpenAiV1TextMessageNode
	| LcOpenAiV1TextClassifyNode
	| LcOpenAiV1ImageAnalyzeNode
	| LcOpenAiV1ImageGenerateNode
	| LcOpenAiV1AudioGenerateNode
	| LcOpenAiV1AudioTranscribeNode
	| LcOpenAiV1AudioTranslateNode
	| LcOpenAiV1FileDeleteFileNode
	| LcOpenAiV1FileListNode
	| LcOpenAiV1FileUploadNode
	;