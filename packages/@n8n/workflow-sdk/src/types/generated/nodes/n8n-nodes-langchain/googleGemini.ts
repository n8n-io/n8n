/**
 * Google Gemini Node Types
 *
 * Interact with Google Gemini AI models
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlegemini/
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

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV11AudioAnalyzeConfig = {
	resource: 'audio';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL(s) of the audio(s) to analyze, multiple URLs can be added separated by comma
	 */
	audioUrls?: string | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the audio(s), seperate multiple field names with commas
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Transcribes audio into the text */
export type LcGoogleGeminiV11AudioTranscribeConfig = {
	resource: 'audio';
	operation: 'transcribe';
	modelId: ResourceLocatorValue;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL(s) of the audio(s) to transcribe, multiple URLs can be added separated by comma
	 */
	audioUrls?: string | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the audio(s), seperate multiple field names with commas
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV11DocumentAnalyzeConfig = {
	resource: 'document';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL(s) of the document(s) to analyze, multiple URLs can be added separated by comma
	 */
	documentUrls?: string | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the document(s), seperate multiple field names with commas
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a new File Search store for RAG (Retrieval Augmented Generation) */
export type LcGoogleGeminiV11FileSearchCreateStoreConfig = {
	resource: 'fileSearch';
	operation: 'createStore';
	/**
	 * A human-readable name for the File Search store
	 */
	displayName: string | Expression<string>;
};

/** Delete a File Search store */
export type LcGoogleGeminiV11FileSearchDeleteStoreConfig = {
	resource: 'fileSearch';
	operation: 'deleteStore';
	/**
	 * The full name of the File Search store to delete (format: fileSearchStores/...)
	 */
	fileSearchStoreName: string | Expression<string>;
	/**
	 * Whether to delete related Documents and objects. If false, deletion will fail if the store contains any Documents.
	 * @default false
	 */
	force?: boolean | Expression<boolean>;
};

/** List all File Search stores owned by the user */
export type LcGoogleGeminiV11FileSearchListStoresConfig = {
	resource: 'fileSearch';
	operation: 'listStores';
	/**
	 * Maximum number of File Search stores to return per page (max 20)
	 * @default 10
	 */
	pageSize?: number | Expression<number>;
	/**
	 * Token from a previous page to retrieve the next page of results
	 */
	pageToken?: string | Expression<string>;
};

/** Upload a file to a File Search store for RAG (Retrieval Augmented Generation) */
export type LcGoogleGeminiV11FileSearchUploadToStoreConfig = {
	resource: 'fileSearch';
	operation: 'uploadToStore';
	/**
	 * The full name of the File Search store to upload to (format: fileSearchStores/...)
	 */
	fileSearchStoreName: string | Expression<string>;
	/**
	 * A human-readable name for the file (will be visible in citations)
	 */
	displayName: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL of the file to upload
	 */
	fileUrl?: string | Expression<string>;
	/**
	 * Name of the binary property which contains the file
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV11ImageAnalyzeConfig = {
	resource: 'image';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma
	 */
	imageUrls?: string | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the image(s), separate multiple field names with commas
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Creates an image from a text prompt */
export type LcGoogleGeminiV11ImageGenerateConfig = {
	resource: 'image';
	operation: 'generate';
	modelId: ResourceLocatorValue;
	/**
	 * A text description of the desired image(s)
	 */
	prompt?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload one or more images and apply edits based on a prompt */
export type LcGoogleGeminiV11ImageEditConfig = {
	resource: 'image';
	operation: 'edit';
	modelId: ResourceLocatorValue;
	/**
	 * Instruction describing how to edit the image
	 */
	prompt?: string | Expression<string>;
	/**
	 * Add one or more binary fields to include images with your prompt
	 * @default {"values":[{"binaryPropertyName":"data"}]}
	 */
	images?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Upload a file to the Google Gemini API for later use */
export type LcGoogleGeminiV11FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL of the file to upload
	 */
	fileUrl?: string | Expression<string>;
	/**
	 * Name of the binary property which contains the file
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
};

/** Create a completion with Google Gemini model */
export type LcGoogleGeminiV11TextMessageConfig = {
	resource: 'text';
	operation: 'message';
	modelId: ResourceLocatorValue;
	messages?: Record<string, unknown>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	/**
	 * Whether to attempt to return the response in JSON format
	 * @default false
	 */
	jsonOutput?: boolean | Expression<boolean>;
	builtInTools?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Take in audio and answer questions about it */
export type LcGoogleGeminiV11VideoAnalyzeConfig = {
	resource: 'video';
	operation: 'analyze';
	modelId: ResourceLocatorValue;
	text?: string | Expression<string>;
	inputType?: 'url' | 'binary' | Expression<string>;
	/**
	 * URL(s) of the video(s) to analyze, multiple URLs can be added separated by comma
	 */
	videoUrls?: string | Expression<string>;
	/**
	 * Name of the binary field(s) which contains the video(s), seperate multiple field names with commas
	 * @default data
	 */
	binaryPropertyName?: string | Expression<string>;
	/**
	 * Whether to simplify the response or not
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Creates an image from a text prompt */
export type LcGoogleGeminiV11VideoGenerateConfig = {
	resource: 'video';
	operation: 'generate';
	modelId: ResourceLocatorValue;
	/**
	 * A text description of the desired video
	 */
	prompt?: string | Expression<string>;
	/**
	 * Whether to return the video as a binary file or a URL that can be used to download the video later
	 * @default video
	 */
	returnAs?: 'video' | 'url' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download a generated video from the Google Gemini API using a URL */
export type LcGoogleGeminiV11VideoDownloadConfig = {
	resource: 'video';
	operation: 'download';
	/**
	 * The URL from Google Gemini API to download the video from
	 */
	url?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcGoogleGeminiV11Params =
	| LcGoogleGeminiV11AudioAnalyzeConfig
	| LcGoogleGeminiV11AudioTranscribeConfig
	| LcGoogleGeminiV11DocumentAnalyzeConfig
	| LcGoogleGeminiV11FileSearchCreateStoreConfig
	| LcGoogleGeminiV11FileSearchDeleteStoreConfig
	| LcGoogleGeminiV11FileSearchListStoresConfig
	| LcGoogleGeminiV11FileSearchUploadToStoreConfig
	| LcGoogleGeminiV11ImageAnalyzeConfig
	| LcGoogleGeminiV11ImageGenerateConfig
	| LcGoogleGeminiV11ImageEditConfig
	| LcGoogleGeminiV11FileUploadConfig
	| LcGoogleGeminiV11TextMessageConfig
	| LcGoogleGeminiV11VideoAnalyzeConfig
	| LcGoogleGeminiV11VideoGenerateConfig
	| LcGoogleGeminiV11VideoDownloadConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcGoogleGeminiV11Credentials {
	googlePalmApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcGoogleGeminiNode = {
	type: '@n8n/n8n-nodes-langchain.googleGemini';
	version: 1 | 1.1;
	config: NodeConfig<LcGoogleGeminiV11Params>;
	credentials?: LcGoogleGeminiV11Credentials;
};
