/**
 * Wuyinke Provider for Image Generation
 * Async API with submit + polling pattern
 * @see https://api.wuyinkeji.com/doc/43 (submit)
 * @see https://api.wuyinkeji.com/doc/9 (query)
 */

import { createHmac } from 'crypto';

import { NANOBANANA_CONFIG } from '../config';
import type {
	ImageGenerationRequest,
	GenerateResult,
	StatusResponse,
	WuyinkeSubmitResponse,
	WuyinkeStatusResponse,
} from '../interfaces';
import { BaseImageProvider } from './base.provider';

/**
 * Wuyinke provider - async image generation with polling
 */
export class WuyinkeProvider extends BaseImageProvider {
	readonly providerType = 'wuyinke' as const;

	/**
	 * Generate HMAC-SHA256 signature for API authentication
	 */
	private generateSignatureHeaders(): Record<string, string> {
		const { apiKey, secretKey } = NANOBANANA_CONFIG.wuyinke;
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const signString = `key=${apiKey}&timestamp=${timestamp}`;
		const signature = createHmac('sha256', secretKey).update(signString).digest('hex');

		return {
			'X-Api-Key': apiKey,
			'X-Api-Timestamp': timestamp,
			'X-Api-Sign': signature,
		};
	}

	/**
	 * Map aspectRatio to Wuyinke format
	 * Wuyinke supports: auto, 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 5:4, 4:5, 21:9
	 */
	private mapAspectRatio(aspectRatio: string): string {
		// Direct mapping - Wuyinke supports the same formats
		const supportedRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
		return supportedRatios.includes(aspectRatio) ? aspectRatio : 'auto';
	}

	/**
	 * Submit an image generation request
	 */
	async submit(request: ImageGenerationRequest): Promise<{ taskId: string }> {
		const { baseUrl } = NANOBANANA_CONFIG.wuyinke;

		const signatureHeaders = this.generateSignatureHeaders();

		// Build request body
		const body: Record<string, unknown> = {
			prompt: request.prompt,
			aspectRatio: this.mapAspectRatio(request.aspectRatio),
			imageSize: request.imageSize || '1K',
		};

		// Add reference images if provided
		if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
			body.img_url = request.referenceImageUrls;
		}

		const response = (await this.ctx.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/api/img/nanoBanana-pro`,
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				...signatureHeaders,
			},
			body,
			json: true,
		})) as WuyinkeSubmitResponse;

		if (response.code !== 200) {
			throw new Error(`Wuyinke submit failed: ${response.msg || 'Unknown error'}`);
		}

		if (!response.data?.id) {
			throw new Error('Wuyinke: No task ID returned from API');
		}

		return {
			taskId: String(response.data.id),
		};
	}

	/**
	 * Get the status of an image generation task
	 */
	async getStatus(taskId: string): Promise<StatusResponse> {
		const { apiKey, baseUrl } = NANOBANANA_CONFIG.wuyinke;
		const signatureHeaders = this.generateSignatureHeaders();

		const response = (await this.ctx.helpers.httpRequest({
			method: 'GET',
			url: `${baseUrl}/api/img/drawDetail?key=${apiKey}&id=${taskId}`,
			headers: {
				...signatureHeaders,
			},
			json: true,
		})) as WuyinkeStatusResponse;

		// Map Wuyinke status codes to standard status
		// 0=queued, 1=processing, 2=success, 3=failed
		const statusMap: Record<number, StatusResponse['status']> = {
			0: 'queued',
			1: 'processing',
			2: 'completed',
			3: 'failed',
		};

		const rawStatus = response.data?.status;
		const status = rawStatus !== undefined ? statusMap[rawStatus] : 'queued';

		return {
			status: status || 'queued',
			imageUrl: response.data?.image_url,
			error: rawStatus === 3 ? 'Image generation failed' : undefined,
		};
	}

	/**
	 * Generate an image (submit + wait for completion + download)
	 */
	async generate(request: ImageGenerationRequest): Promise<GenerateResult> {
		try {
			// Submit the request
			const { taskId } = await this.submit(request);

			// Wait for completion (default: 300 seconds timeout, 5 second intervals)
			const status = await this.waitForCompletion(taskId, 300, 5);

			if (status.status === 'completed' && status.imageUrl) {
				// Download the generated image
				const imageData = await this.downloadImage(status.imageUrl);

				// Detect mime type from URL
				const mimeType = this.detectMimeType(status.imageUrl);

				return {
					success: true,
					imageData,
					mimeType,
				};
			}

			return {
				success: false,
				error: status.error || 'Image generation failed or timed out',
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Detect MIME type from URL
	 */
	private detectMimeType(url: string): string {
		const lowerUrl = url.toLowerCase();
		if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
			return 'image/jpeg';
		}
		if (lowerUrl.includes('.webp')) {
			return 'image/webp';
		}
		if (lowerUrl.includes('.gif')) {
			return 'image/gif';
		}
		return 'image/png';
	}
}
