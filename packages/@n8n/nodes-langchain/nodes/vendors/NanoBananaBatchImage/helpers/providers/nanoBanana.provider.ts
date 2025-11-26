/**
 * NanoBanana (Google AI Platform) Provider
 * Synchronous streaming image generation via Gemini API
 */

import type {
	ImageGenerationRequest,
	GenerateResult,
	GeminiImageRequest,
	GeminiImageResponse,
	Content,
	ContentPart,
	SafetySetting,
	NanoBananaCredentials,
	HarmBlockThreshold,
} from '../interfaces';
import { BaseImageProvider } from './base.provider';
import { getMimeTypeFromUrl, imageToBase64 } from '../transport';

/**
 * NanoBanana provider - uses Google AI Platform / Gemini API
 */
export class NanoBananaProvider extends BaseImageProvider {
	readonly providerType = 'nanoBanana' as const;

	/**
	 * Generate an image using Gemini API
	 */
	async generate(request: ImageGenerationRequest): Promise<GenerateResult> {
		try {
			// Get credentials
			const credentials = await this.ctx.getCredentials<NanoBananaCredentials>('nanoBananaApi');
			const apiEndpoint = credentials.apiEndpoint || 'aiplatform.googleapis.com';

			// Build content parts with prompt
			const parts: ContentPart[] = [{ text: request.prompt }];

			// Download and include reference images (if any)
			if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
				// Limit to 14 images max
				const limitedUrls = request.referenceImageUrls.slice(0, 14);

				for (const imageUrl of limitedUrls) {
					const imageBuffer = await this.downloadImage(imageUrl);
					const base64Image = imageToBase64(imageBuffer);
					const mimeType = getMimeTypeFromUrl(imageUrl);

					// Prepend images before text prompt
					parts.unshift({
						inlineData: {
							mimeType,
							data: base64Image,
						},
					});
				}
			}

			const contents: Content[] = [
				{
					role: 'user',
					parts,
				},
			];

			// Build safety settings
			const safetyThreshold = (request.safetyThreshold ?? 'OFF') as HarmBlockThreshold;
			const safetySettings: SafetySetting[] = [
				{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: safetyThreshold },
				{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: safetyThreshold },
				{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: safetyThreshold },
				{ category: 'HARM_CATEGORY_HARASSMENT', threshold: safetyThreshold },
			];

			// Build request body
			const requestBody: GeminiImageRequest = {
				contents,
				systemInstruction: request.systemInstruction
					? { parts: [{ text: request.systemInstruction }] }
					: undefined,
				generationConfig: {
					temperature: request.temperature ?? 1,
					maxOutputTokens: request.maxOutputTokens ?? 32768,
					responseModalities: ['TEXT', 'IMAGE'],
					topP: request.topP ?? 0.95,
					imageConfig: {
						aspectRatio: request.aspectRatio,
						imageSize: request.imageSize,
						imageOutputOptions: {
							mimeType: request.mimeType,
						},
						personGeneration: request.personGeneration ?? 'ALLOW_ALL',
					},
				},
				safetySettings,
			};

			// Make API request
			const endpoint = `/v1/publishers/google/models/${request.model}:streamGenerateContent`;
			const url = `https://${apiEndpoint}${endpoint}?key=${credentials.apiKey}`;

			const response = (await this.ctx.helpers.httpRequest({
				method: 'POST',
				url,
				headers: {
					'Content-Type': 'application/json',
				},
				body: requestBody,
				json: true,
			})) as GeminiImageResponse | GeminiImageResponse[];

			// Handle streaming response (array of responses)
			const responses = Array.isArray(response) ? response : [response];

			// Check for API errors
			for (const resp of responses) {
				if (resp.error) {
					return {
						success: false,
						error: `API Error: ${resp.error.message}`,
					};
				}
			}

			// Extract image data from responses
			for (const resp of responses) {
				if (!resp.candidates || resp.candidates.length === 0) {
					continue;
				}

				for (const candidate of resp.candidates) {
					for (const part of candidate.content.parts) {
						if ('inlineData' in part && part.inlineData) {
							const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
							return {
								success: true,
								imageData: imageBuffer,
								mimeType: part.inlineData.mimeType,
							};
						}
					}
				}
			}

			// If no images were generated, try to extract text response
			let textResponse = '';
			for (const resp of responses) {
				for (const candidate of resp.candidates ?? []) {
					for (const part of candidate.content.parts) {
						if ('text' in part) {
							textResponse += part.text;
						}
					}
				}
			}

			return {
				success: false,
				error: 'No image was generated',
				textResponse: textResponse || undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
