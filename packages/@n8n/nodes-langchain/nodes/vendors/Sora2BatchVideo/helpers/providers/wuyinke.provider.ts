/**
 * Sora2 Batch Video - wuyinkeji.com Provider
 * @see https://api.wuyinkeji.com/doc/35
 */

import { createHmac } from 'crypto';
import type {
	StatusResponse,
	SubmitResponse,
	VideoGenerationRequest,
	WuyinkeDetailResponse,
	WuyinkeSubmitResponse,
} from '../interfaces';
import { SORA2_CONFIG } from '../config';
import { BaseSora2Provider } from './base.provider';

/**
 * wuyinkeji.com provider implementation
 */
export class WuyinkeProvider extends BaseSora2Provider {
	readonly providerType = 'wuyinke' as const;

	/**
	 * Generate signature headers for wuyinke API
	 */
	private generateSignatureHeaders(): Record<string, string> {
		const { apiKey, secretKey } = SORA2_CONFIG.wuyinke;
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
	 * Submit a video generation request to wuyinkeji.com
	 */
	async submit(request: VideoGenerationRequest): Promise<SubmitResponse> {
		const { apiKey, baseUrl } = SORA2_CONFIG.wuyinke;

		// Different endpoint for standard vs pro model
		const endpoint = request.model === 'sora2pro' ? '/api/sora2pro/submit' : '/api/sora2/submit';

		// Build URL parameters
		const params = new URLSearchParams({
			key: apiKey,
			prompt: request.prompt,
			aspectRatio: request.aspectRatio,
			duration: String(request.duration),
		});

		// Add reference image URL for image2video
		if (request.referenceImageUrl) {
			params.append('url', request.referenceImageUrl);
		}

		// Add size for standard model
		if (request.model === 'sora2' && request.size) {
			params.append('size', request.size);
		}

		const signatureHeaders = this.generateSignatureHeaders();

		const response = (await this.ctx.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}${endpoint}?${params.toString()}`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				...signatureHeaders,
			},
		})) as WuyinkeSubmitResponse;

		if (response.code !== 200) {
			throw new Error(`Failed to submit video generation: ${response.msg || 'Unknown error'}`);
		}

		// Task ID can be in data.id or just data (as string)
		let taskId: string;
		if (typeof response.data === 'string') {
			taskId = response.data;
		} else if (response.data?.id) {
			taskId = response.data.id;
		} else {
			throw new Error('No task ID returned from API');
		}

		return {
			taskId,
			provider: 'wuyinke',
		};
	}

	/**
	 * Get the status of a video generation task
	 */
	async getStatus(taskId: string): Promise<StatusResponse> {
		const { apiKey, baseUrl } = SORA2_CONFIG.wuyinke;
		const signatureHeaders = this.generateSignatureHeaders();

		const response = (await this.ctx.helpers.httpRequest({
			method: 'GET',
			url: `${baseUrl}/api/sora2/detail?key=${apiKey}&id=${taskId}`,
			headers: {
				...signatureHeaders,
			},
			json: true,
		})) as WuyinkeDetailResponse;

		// Map wuyinke status codes to our standard status
		// status: 0=queued, 1=success, 2=failed, 3=processing
		const statusMap: Record<number, StatusResponse['status']> = {
			0: 'pending',
			1: 'completed',
			2: 'failed',
			3: 'processing',
		};

		const rawStatus = response.data?.status;
		const status = rawStatus !== undefined ? statusMap[rawStatus] : 'pending';

		return {
			taskId,
			status: status || 'pending',
			videoUrl: response.data?.remote_url,
			error: rawStatus === 2 ? 'Video generation failed' : undefined,
		};
	}

	/**
	 * Download video from URL
	 */
	async downloadVideo(videoUrl: string): Promise<Buffer> {
		const response = await this.ctx.helpers.httpRequest({
			method: 'GET',
			url: videoUrl,
			encoding: 'arraybuffer',
			returnFullResponse: false,
		});

		return Buffer.from(response as ArrayBuffer);
	}
}
