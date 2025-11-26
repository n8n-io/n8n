import type { IDataObject } from 'n8n-workflow';

/**
 * Provider type for image generation
 */
export type Provider = 'nanoBanana' | 'wuyinke' | 'auto';

/**
 * Safety threshold type
 */
export type SafetyThreshold =
	| 'OFF'
	| 'BLOCK_NONE'
	| 'BLOCK_LOW_AND_ABOVE'
	| 'BLOCK_MEDIUM_AND_ABOVE'
	| 'BLOCK_ONLY_HIGH';

/**
 * Normalized image generation request (provider-agnostic)
 */
export interface ImageGenerationRequest {
	prompt: string;
	referenceImageUrls?: string[];
	aspectRatio: AspectRatio;
	imageSize: ImageSize;
	mimeType: ImageMimeType;
	model: string;
	systemInstruction?: string;
	temperature?: number;
	topP?: number;
	maxOutputTokens?: number;
	safetyThreshold?: SafetyThreshold;
	personGeneration?: PersonGeneration;
}

/**
 * Normalized generation result
 */
export interface GenerateResult {
	success: boolean;
	imageData?: Buffer;
	mimeType?: string;
	textResponse?: string;
	error?: string;
}

/**
 * Normalized status response for async providers
 */
export interface StatusResponse {
	status: 'queued' | 'processing' | 'completed' | 'failed';
	imageUrl?: string;
	imageData?: string;
	mimeType?: string;
	error?: string;
}

/**
 * Wuyinke API submit response
 */
export interface WuyinkeSubmitResponse {
	code: number;
	msg: string;
	data: { id: number };
}

/**
 * Wuyinke API status response
 */
export interface WuyinkeStatusResponse {
	code: number;
	msg: string;
	data: {
		id: number;
		prompt: string;
		image_url: string;
		status: number; // 0=queued, 1=processing, 2=success, 3=failed
		size: string;
		created_at: string;
		updated_at: string;
	};
}

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
 * Streaming response chunk (same structure as GeminiImageResponse)
 */
export type StreamingResponse = GeminiImageResponse;

/**
 * Credentials for API access
 */
export interface NanoBananaCredentials {
	apiKey: string;
	apiEndpoint?: string;
}
