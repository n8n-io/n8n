import type { IDataObject } from 'n8n-workflow';

/**
 * Input item for batch image generation
 */
export interface BatchImageInput {
	prompt: string;
	referenceImageUrl?: string;
}

/**
 * Safety setting category
 */
export type HarmCategory =
	| 'HARM_CATEGORY_HATE_SPEECH'
	| 'HARM_CATEGORY_DANGEROUS_CONTENT'
	| 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
	| 'HARM_CATEGORY_HARASSMENT';

/**
 * Safety setting threshold
 */
export type HarmBlockThreshold =
	| 'OFF'
	| 'BLOCK_NONE'
	| 'BLOCK_LOW_AND_ABOVE'
	| 'BLOCK_MEDIUM_AND_ABOVE'
	| 'BLOCK_ONLY_HIGH';

/**
 * Image aspect ratio
 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

/**
 * Image size
 */
export type ImageSize = '1K' | '2K' | '4K';

/**
 * Image output MIME type
 */
export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Person generation setting
 */
export type PersonGeneration = 'ALLOW_ALL' | 'ALLOW_ADULT' | 'DONT_ALLOW';

/**
 * Content part - text or inline data
 */
export type ContentPart =
	| { text: string }
	| {
			inlineData: {
				mimeType: string;
				data: string;
			};
	  };

/**
 * Content message
 */
export interface Content {
	role: 'user' | 'model';
	parts: ContentPart[];
}

/**
 * Image configuration for generation
 */
export interface ImageConfig {
	aspectRatio?: AspectRatio;
	imageSize?: ImageSize;
	imageOutputOptions?: {
		mimeType?: ImageMimeType;
	};
	personGeneration?: PersonGeneration;
}

/**
 * Generation configuration
 */
export interface GenerationConfig extends IDataObject {
	temperature?: number;
	maxOutputTokens?: number;
	responseModalities?: string[];
	topP?: number;
	imageConfig?: ImageConfig;
}

/**
 * Safety setting
 */
export interface SafetySetting {
	category: HarmCategory;
	threshold: HarmBlockThreshold;
}

/**
 * System instruction
 */
export interface SystemInstruction {
	parts: Array<{ text: string }>;
}

/**
 * Request body for Gemini image generation
 */
export interface GeminiImageRequest extends IDataObject {
	contents: Content[];
	systemInstruction?: SystemInstruction;
	generationConfig?: GenerationConfig;
	safetySettings?: SafetySetting[];
}

/**
 * Response candidate from Gemini
 */
export interface ResponseCandidate {
	content: {
		parts: ContentPart[];
		role: string;
	};
	finishReason?: string;
}

/**
 * Response from Gemini image generation
 */
export interface GeminiImageResponse {
	candidates?: ResponseCandidate[];
	error?: {
		code: number;
		message: string;
		status: string;
	};
}

/**
 * Streaming response chunk
 */
export interface StreamingResponse extends GeminiImageResponse {
	// Same structure for streaming
}

/**
 * Credentials for API access
 */
export interface NanoBananaCredentials {
	apiKey: string;
	apiEndpoint?: string;
}
