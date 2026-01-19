/**
 * Google Gemini Node - Version 1
 * Interact with Google Gemini AI models
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV1AudioAnalyzeConfig = {
	resource: 'audio';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the audio(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["audio"] }
 */
		audioUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the audio(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["audio"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["audio"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Transcribes audio into the text */
export type LcGoogleGeminiV1AudioTranscribeConfig = {
	resource: 'audio';
	operation: 'transcribe';
	modelId: ResourceLocatorValue;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the audio(s) to transcribe, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["transcribe"], resource: ["audio"] }
 */
		audioUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the audio(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["transcribe"], resource: ["audio"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["transcribe"], resource: ["audio"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV1DocumentAnalyzeConfig = {
	resource: 'document';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the document(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["document"] }
 */
		documentUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the document(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["document"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["document"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a new File Search store for RAG (Retrieval Augmented Generation) */
export type LcGoogleGeminiV1FileSearchCreateStoreConfig = {
	resource: 'fileSearch';
	operation: 'createStore';
/**
 * A human-readable name for the File Search store
 * @displayOptions.show { operation: ["createStore"], resource: ["fileSearch"] }
 */
		displayName: string | Expression<string>;
};

/** Delete a File Search store */
export type LcGoogleGeminiV1FileSearchDeleteStoreConfig = {
	resource: 'fileSearch';
	operation: 'deleteStore';
/**
 * The full name of the File Search store to delete (format: fileSearchStores/...)
 * @displayOptions.show { operation: ["deleteStore"], resource: ["fileSearch"] }
 */
		fileSearchStoreName: string | Expression<string>;
/**
 * Whether to delete related Documents and objects. If false, deletion will fail if the store contains any Documents.
 * @displayOptions.show { operation: ["deleteStore"], resource: ["fileSearch"] }
 * @default false
 */
		force?: boolean | Expression<boolean>;
};

/** List all File Search stores owned by the user */
export type LcGoogleGeminiV1FileSearchListStoresConfig = {
	resource: 'fileSearch';
	operation: 'listStores';
/**
 * Maximum number of File Search stores to return per page (max 20)
 * @displayOptions.show { operation: ["listStores"], resource: ["fileSearch"] }
 * @default 10
 */
		pageSize?: number | Expression<number>;
/**
 * Token from a previous page to retrieve the next page of results
 * @displayOptions.show { operation: ["listStores"], resource: ["fileSearch"] }
 */
		pageToken?: string | Expression<string>;
};

/** Upload a file to a File Search store for RAG (Retrieval Augmented Generation) */
export type LcGoogleGeminiV1FileSearchUploadToStoreConfig = {
	resource: 'fileSearch';
	operation: 'uploadToStore';
/**
 * The full name of the File Search store to upload to (format: fileSearchStores/...)
 * @displayOptions.show { operation: ["uploadToStore"], resource: ["fileSearch"] }
 */
		fileSearchStoreName: string | Expression<string>;
/**
 * A human-readable name for the file (will be visible in citations)
 * @displayOptions.show { operation: ["uploadToStore"], resource: ["fileSearch"] }
 */
		displayName: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL of the file to upload
 * @displayOptions.show { inputType: ["url"], operation: ["uploadToStore"], resource: ["fileSearch"] }
 */
		fileUrl?: string | Expression<string>;
/**
 * Name of the binary property which contains the file
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["uploadToStore"], resource: ["fileSearch"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV1ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["image"] }
 */
		imageUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the image(s), separate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["image"] }
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

/** Creates an image from a text prompt */
export type LcGoogleGeminiV1ImageGenerateConfig = {
	resource: 'image';
	operation: 'generate';
	modelId: ResourceLocatorValue;
/**
 * A text description of the desired image(s)
 * @displayOptions.show { operation: ["generate"], resource: ["image"] }
 */
		prompt?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload one or more images and apply edits based on a prompt */
export type LcGoogleGeminiV1ImageEditConfig = {
	resource: 'image';
	operation: 'edit';
	modelId: ResourceLocatorValue;
/**
 * Instruction describing how to edit the image
 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
 */
		prompt?: string | Expression<string>;
/**
 * Add one or more binary fields to include images with your prompt
 * @displayOptions.show { operation: ["edit"], resource: ["image"] }
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
	options?: Record<string, unknown>;
};

/** Upload a file to the Google Gemini API for later use */
export type LcGoogleGeminiV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL of the file to upload
 * @displayOptions.show { inputType: ["url"], operation: ["upload"], resource: ["file"] }
 */
		fileUrl?: string | Expression<string>;
/**
 * Name of the binary property which contains the file
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["upload"], resource: ["file"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
};

/** Create a completion with Google Gemini model */
export type LcGoogleGeminiV1TextMessageConfig = {
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
			role?: 'user' | 'model' | Expression<string>;
		}>;
	};
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to attempt to return the response in JSON format
 * @displayOptions.show { operation: ["message"], resource: ["text"] }
 * @default false
 */
		jsonOutput?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV1VideoAnalyzeConfig = {
	resource: 'video';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
/**
 * URL(s) of the video(s) to analyze, multiple URLs can be added separated by comma
 * @displayOptions.show { inputType: ["url"], operation: ["analyze"], resource: ["video"] }
 */
		videoUrls?: string | Expression<string>;
/**
 * Name of the binary field(s) which contains the video(s), seperate multiple field names with commas
 * @hint The name of the input field containing the binary file data to be processed
 * @displayOptions.show { inputType: ["binary"], operation: ["analyze"], resource: ["video"] }
 * @default data
 */
		binaryPropertyName?: string | Expression<string>;
/**
 * Whether to simplify the response or not
 * @displayOptions.show { operation: ["analyze"], resource: ["video"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Creates an image from a text prompt */
export type LcGoogleGeminiV1VideoGenerateConfig = {
	resource: 'video';
	operation: 'generate';
	modelId: ResourceLocatorValue;
/**
 * A text description of the desired video
 * @displayOptions.show { operation: ["generate"], resource: ["video"] }
 */
		prompt?: string | Expression<string>;
/**
 * Whether to return the video as a binary file or a URL that can be used to download the video later
 * @displayOptions.show { operation: ["generate"], resource: ["video"] }
 * @default video
 */
		returnAs?: 'video' | 'url' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download a generated video from the Google Gemini API using a URL */
export type LcGoogleGeminiV1VideoDownloadConfig = {
	resource: 'video';
	operation: 'download';
/**
 * The URL from Google Gemini API to download the video from
 * @displayOptions.show { operation: ["download"], resource: ["video"] }
 */
		url?: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcGoogleGeminiV1Credentials {
	googlePalmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcGoogleGeminiV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.googleGemini';
	version: 1;
	credentials?: LcGoogleGeminiV1Credentials;
}

export type LcGoogleGeminiV1AudioAnalyzeNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1AudioAnalyzeConfig>;
};

export type LcGoogleGeminiV1AudioTranscribeNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1AudioTranscribeConfig>;
};

export type LcGoogleGeminiV1DocumentAnalyzeNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1DocumentAnalyzeConfig>;
};

export type LcGoogleGeminiV1FileSearchCreateStoreNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1FileSearchCreateStoreConfig>;
};

export type LcGoogleGeminiV1FileSearchDeleteStoreNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1FileSearchDeleteStoreConfig>;
};

export type LcGoogleGeminiV1FileSearchListStoresNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1FileSearchListStoresConfig>;
};

export type LcGoogleGeminiV1FileSearchUploadToStoreNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1FileSearchUploadToStoreConfig>;
};

export type LcGoogleGeminiV1ImageAnalyzeNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1ImageAnalyzeConfig>;
};

export type LcGoogleGeminiV1ImageGenerateNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1ImageGenerateConfig>;
};

export type LcGoogleGeminiV1ImageEditNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1ImageEditConfig>;
};

export type LcGoogleGeminiV1FileUploadNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1FileUploadConfig>;
};

export type LcGoogleGeminiV1TextMessageNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1TextMessageConfig>;
};

export type LcGoogleGeminiV1VideoAnalyzeNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1VideoAnalyzeConfig>;
};

export type LcGoogleGeminiV1VideoGenerateNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1VideoGenerateConfig>;
};

export type LcGoogleGeminiV1VideoDownloadNode = LcGoogleGeminiV1NodeBase & {
	config: NodeConfig<LcGoogleGeminiV1VideoDownloadConfig>;
};

export type LcGoogleGeminiV1Node =
	| LcGoogleGeminiV1AudioAnalyzeNode
	| LcGoogleGeminiV1AudioTranscribeNode
	| LcGoogleGeminiV1DocumentAnalyzeNode
	| LcGoogleGeminiV1FileSearchCreateStoreNode
	| LcGoogleGeminiV1FileSearchDeleteStoreNode
	| LcGoogleGeminiV1FileSearchListStoresNode
	| LcGoogleGeminiV1FileSearchUploadToStoreNode
	| LcGoogleGeminiV1ImageAnalyzeNode
	| LcGoogleGeminiV1ImageGenerateNode
	| LcGoogleGeminiV1ImageEditNode
	| LcGoogleGeminiV1FileUploadNode
	| LcGoogleGeminiV1TextMessageNode
	| LcGoogleGeminiV1VideoAnalyzeNode
	| LcGoogleGeminiV1VideoGenerateNode
	| LcGoogleGeminiV1VideoDownloadNode
	;