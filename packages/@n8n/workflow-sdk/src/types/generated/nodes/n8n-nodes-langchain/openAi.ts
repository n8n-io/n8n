/**
 * OpenAI Node Types
 *
 * Message an assistant or GPT, analyze images, generate audio, etc.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/openai/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Generate a model response with GPT 3, 4, 5, etc. using Responses API */
export type LcOpenAiV21TextResponseConfig = {
	resource: 'text';
	operation: 'response';
	modelId: ResourceLocatorValue;
	responses?: {
		values?: Array<{
			/** Type
			 * @default text
			 */
			type?: 'text' | 'image' | 'file' | Expression<string>;
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | 'system' | Expression<string>;
			/** The content of the message to be send
			 * @displayOptions.show { type: ["text"] }
			 */
			content?: string | Expression<string>;
			/** Image Type
			 * @displayOptions.show { type: ["image"] }
			 * @default url
			 */
			imageType?: 'url' | 'fileId' | 'base64' | Expression<string>;
			/** URL of the image to be sent
			 * @displayOptions.show { type: ["image"], imageType: ["url"] }
			 */
			imageUrl?: string | Expression<string>;
			/** Name of the binary property which contains the image(s)
			 * @hint The name of the input field containing the binary file data to be processed
			 * @displayOptions.show { type: ["image"], imageType: ["base64"] }
			 * @default data
			 */
			binaryPropertyName?: string | Expression<string>;
			/** ID of the file to be sent
			 * @displayOptions.show { type: ["image"], imageType: ["fileId"] }
			 */
			fileId?: string | Expression<string>;
			/** The detail level of the image to be sent to the model
			 * @displayOptions.show { type: ["image"] }
			 * @default auto
			 */
			imageDetail?: 'auto' | 'low' | 'high' | Expression<string>;
			/** File Type
			 * @displayOptions.show { type: ["file"] }
			 * @default url
			 */
			fileType?: 'url' | 'fileId' | 'base64' | Expression<string>;
			/** URL of the file to be sent. Accepts base64 encoded files as well.
			 * @displayOptions.show { type: ["file"], fileType: ["url"] }
			 */
			fileUrl?: string | Expression<string>;
			/** ID of the file to be sent
			 * @displayOptions.show { type: ["file"], fileType: ["fileId"] }
			 */
			fileId?: string | Expression<string>;
			/** Name of the binary property which contains the file
			 * @hint The name of the input field containing the binary file data to be processed
			 * @displayOptions.show { type: ["file"], fileType: ["base64"] }
			 * @default data
			 */
			binaryPropertyName?: string | Expression<string>;
			/** File Name
			 * @displayOptions.show { type: ["file"], fileType: ["base64"] }
			 */
			fileName?: string | Expression<string>;
		}>;
	};
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { operation: ["response"], resource: ["text"] }
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	hideTools?: unknown;
	builtInTools?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Check whether content complies with usage policies */
export type LcOpenAiV21TextClassifyConfig = {
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
export type LcOpenAiV21ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
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
export type LcOpenAiV21ImageGenerateConfig = {
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

/** Edit an image */
export type LcOpenAiV21ImageEditConfig = {
	resource: 'image';
	operation: 'edit';
	/**
	 * The model to use for image generation
	 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
	 * @default gpt-image-1
	 */
	model?: 'dall-e-2' | 'gpt-image-1' | Expression<string>;
	/**
	 * A text description of the desired image(s). Maximum 1000 characters for dall-e-2, 32000 characters for gpt-image-1.
	 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
	 */
	prompt: string | Expression<string>;
	/**
	 * Add one or more binary fields to include images with your prompt. Each image should be a png, webp, or jpg file less than 50MB. You can provide up to 16 images.
	 * @displayOptions.show { /model: ["gpt-image-1"], operation: ["edit"], resource: ["image"] }
	 * @default {"values":[{"binaryPropertyName":"data"}]}
	 */
	images?: {
		values?: Array<{
			/** The name of the binary field containing the image data
			 * @default data
			 */
			binaryPropertyName?: string | Expression<string>;
		}>;
	};
	/**
	 * Name of the binary property which contains the image. It should be a square png file less than 4MB.
	 * @hint The name of the input field containing the binary file data to be processed
	 * @displayOptions.show { /model: ["dall-e-2"], operation: ["edit"], resource: ["image"] }
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * The number of images to generate. Must be between 1 and 10.
	 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
	 * @default 1
	 */
	n?: number | Expression<number>;
	/**
	 * The size of the generated images
	 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
	 * @default 1024x1024
	 */
	size?:
		| '256x256'
		| '512x512'
		| '1024x1024'
		| '1024x1536'
		| '1536x1024'
		| 'auto'
		| Expression<string>;
	/**
	 * The quality of the image that will be generated
	 * @displayOptions.show { /model: ["gpt-image-1"], operation: ["edit"], resource: ["image"] }
	 * @default auto
	 */
	quality?: 'auto' | 'high' | 'medium' | 'low' | 'standard' | Expression<string>;
	/**
	 * The format in which the generated images are returned. URLs are only valid for 60 minutes after generation.
	 * @displayOptions.show { /model: ["dall-e-2"], operation: ["edit"], resource: ["image"] }
	 * @default url
	 */
	responseFormat?: 'url' | 'b64_json' | Expression<string>;
	/**
	 * The format in which the generated images are returned. Only supported for gpt-image-1.
	 * @displayOptions.show { /model: ["gpt-image-1"], operation: ["edit"], resource: ["image"] }
	 * @default png
	 */
	outputFormat?: 'png' | 'jpeg' | 'webp' | Expression<string>;
	/**
	 * The compression level (0-100%) for the generated images. Only supported for gpt-image-1 with webp or jpeg output formats.
	 * @displayOptions.show { /model: ["gpt-image-1"], outputFormat: ["webp", "jpeg"], operation: ["edit"], resource: ["image"] }
	 * @default 100
	 */
	outputCompression?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Creates audio from a text prompt */
export type LcOpenAiV21AudioGenerateConfig = {
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
export type LcOpenAiV21AudioTranscribeConfig = {
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
export type LcOpenAiV21AudioTranslateConfig = {
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
export type LcOpenAiV21FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
	fileId: ResourceLocatorValue;
};

/** Returns a list of files that belong to the user's organization */
export type LcOpenAiV21FileListConfig = {
	resource: 'file';
	operation: 'list';
	options?: Record<string, unknown>;
};

/** Upload a file that can be used across various endpoints */
export type LcOpenAiV21FileUploadConfig = {
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

/** Create a conversation */
export type LcOpenAiV21ConversationCreateConfig = {
	resource: 'conversation';
	operation: 'create';
	messages?: {
		values?: Array<{
			/** Role in shaping the model's response, it tells the model how it should behave and interact with the user
			 * @default user
			 */
			role?: 'user' | 'assistant' | 'system' | Expression<string>;
			/** The content of the message to be send
			 */
			content?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get a conversation */
export type LcOpenAiV21ConversationGetConfig = {
	resource: 'conversation';
	operation: 'get';
	/**
	 * The ID of the conversation to retrieve
	 * @displayOptions.show { operation: ["get"], resource: ["conversation"] }
	 */
	conversationId: string | Expression<string>;
};

/** Remove a conversation */
export type LcOpenAiV21ConversationRemoveConfig = {
	resource: 'conversation';
	operation: 'remove';
	/**
	 * The ID of the conversation to delete
	 * @displayOptions.show { operation: ["remove"], resource: ["conversation"] }
	 */
	conversationId: string | Expression<string>;
};

/** Update a conversation */
export type LcOpenAiV21ConversationUpdateConfig = {
	resource: 'conversation';
	operation: 'update';
	/**
	 * The ID of the conversation to update
	 * @displayOptions.show { operation: ["update"], resource: ["conversation"] }
	 */
	conversationId: string | Expression<string>;
	/**
	 * Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard. Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
	 * @displayOptions.show { operation: ["update"], resource: ["conversation"] }
	 * @default {}
	 */
	metadata: IDataObject | string | Expression<string>;
};

/** Creates audio from a text prompt */
export type LcOpenAiV21VideoGenerateConfig = {
	resource: 'video';
	operation: 'generate';
	modelId: ResourceLocatorValue;
	/**
	 * The prompt to generate a video from
	 * @displayOptions.show { operation: ["generate"], resource: ["video"] }
	 * @default A video of a cat playing with a ball
	 */
	prompt: string | Expression<string>;
	/**
	 * Clip duration in seconds
	 * @displayOptions.show { operation: ["generate"], resource: ["video"] }
	 * @default 4
	 */
	seconds: number | Expression<number>;
	/**
	 * Output resolution formatted as width x height. 1024x1792 and 1792x1024 are only supported by Sora 2 Pro.
	 * @displayOptions.show { operation: ["generate"], resource: ["video"] }
	 * @default 1280x720
	 */
	size?: '720x1280' | '1280x720' | '1024x1792' | '1792x1024' | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcOpenAiV21Params =
	| LcOpenAiV21TextResponseConfig
	| LcOpenAiV21TextClassifyConfig
	| LcOpenAiV21ImageAnalyzeConfig
	| LcOpenAiV21ImageGenerateConfig
	| LcOpenAiV21ImageEditConfig
	| LcOpenAiV21AudioGenerateConfig
	| LcOpenAiV21AudioTranscribeConfig
	| LcOpenAiV21AudioTranslateConfig
	| LcOpenAiV21FileDeleteFileConfig
	| LcOpenAiV21FileListConfig
	| LcOpenAiV21FileUploadConfig
	| LcOpenAiV21ConversationCreateConfig
	| LcOpenAiV21ConversationGetConfig
	| LcOpenAiV21ConversationRemoveConfig
	| LcOpenAiV21ConversationUpdateConfig
	| LcOpenAiV21VideoGenerateConfig;

/** Create a new assistant */
export type LcOpenAiV18AssistantCreateConfig = {
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
export type LcOpenAiV18AssistantDeleteAssistantConfig = {
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
export type LcOpenAiV18AssistantListConfig = {
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
export type LcOpenAiV18AssistantMessageConfig = {
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
	memory?: 'connector' | 'threadId' | Expression<string>;
	/**
	 * The ID of the thread to continue, a new thread will be created if not specified
	 * @hint If the thread ID is empty or undefined a new thread will be created and included in the response
	 * @displayOptions.show { @version: [{"_cnd":{"gte":1.6}}], memory: ["threadId"], operation: ["message"], resource: ["assistant"] }
	 */
	threadId?: string | Expression<string>;
	/**
	 * Additional options to add
	 * @displayOptions.show { operation: ["message"], resource: ["assistant"] }
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Update an existing assistant */
export type LcOpenAiV18AssistantUpdateConfig = {
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
export type LcOpenAiV18TextMessageConfig = {
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
	hideTools?: unknown;
	options?: Record<string, unknown>;
};

/** Check whether content complies with usage policies */
export type LcOpenAiV18TextClassifyConfig = {
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
export type LcOpenAiV18ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
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
export type LcOpenAiV18ImageGenerateConfig = {
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
export type LcOpenAiV18AudioGenerateConfig = {
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
export type LcOpenAiV18AudioTranscribeConfig = {
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
export type LcOpenAiV18AudioTranslateConfig = {
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
export type LcOpenAiV18FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
	fileId: ResourceLocatorValue;
};

/** List assistants in the organization */
export type LcOpenAiV18FileListConfig = {
	resource: 'file';
	operation: 'list';
	options?: Record<string, unknown>;
};

/** Upload a file that can be used across various endpoints */
export type LcOpenAiV18FileUploadConfig = {
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

export type LcOpenAiV18Params =
	| LcOpenAiV18AssistantCreateConfig
	| LcOpenAiV18AssistantDeleteAssistantConfig
	| LcOpenAiV18AssistantListConfig
	| LcOpenAiV18AssistantMessageConfig
	| LcOpenAiV18AssistantUpdateConfig
	| LcOpenAiV18TextMessageConfig
	| LcOpenAiV18TextClassifyConfig
	| LcOpenAiV18ImageAnalyzeConfig
	| LcOpenAiV18ImageGenerateConfig
	| LcOpenAiV18AudioGenerateConfig
	| LcOpenAiV18AudioTranscribeConfig
	| LcOpenAiV18AudioTranslateConfig
	| LcOpenAiV18FileDeleteFileConfig
	| LcOpenAiV18FileListConfig
	| LcOpenAiV18FileUploadConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcOpenAiV21Credentials {
	openAiApi: CredentialReference;
}

export interface LcOpenAiV18Credentials {
	openAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcOpenAiV21Node = {
	type: '@n8n/n8n-nodes-langchain.openAi';
	version: 2 | 2.1;
	config: NodeConfig<LcOpenAiV21Params>;
	credentials?: LcOpenAiV21Credentials;
};

export type LcOpenAiV18Node = {
	type: '@n8n/n8n-nodes-langchain.openAi';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | 1.7 | 1.8;
	config: NodeConfig<LcOpenAiV18Params>;
	credentials?: LcOpenAiV18Credentials;
};

export type LcOpenAiNode = LcOpenAiV21Node | LcOpenAiV18Node;
