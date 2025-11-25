/**
 * Sora2 Batch Video - wuyinkeji.com Provider
 */

import type {
	StatusResponse,
	SubmitResponse,
	VideoGenerationRequest,
	WuyinkeCredentials,
	WuyinkeDetailResponse,
	WuyinkeSubmitResponse,
} from '../interfaces';
import { BaseSora2Provider } from './base.provider';

/**
 * wuyinkeji.com provider implementation
 */
export class WuyinkeProvider extends BaseSora2Provider {
	readonly providerType = 'wuyinke' as const;

	/**
	 * Submit a video generation request to wuyinkeji.com
	 */
	async submit(request: VideoGenerationRequest): Promise<SubmitResponse> {
		const credentials = await this.ctx.getCredentials<WuyinkeCredentials>('wuyinkeSora2Api');
		const baseUrl = credentials.apiEndpoint || 'https://api.wuyinkeji.com';

		// Different endpoint for standard vs pro model
		const endpoint = request.model === 'sora2pro' ? '/api/sora2pro/submit' : '/api/sora2/submit';

		// Build request body according to wuyinkeji API
		const body: Record<string, unknown> = {
			prompt: request.prompt,
			aspectRatio: request.aspectRatio,
			duration: String(request.duration),
		};

		// Add reference image URL for image2video
		if (request.referenceImageUrl) {
			body.url = request.referenceImageUrl;
		}

		// Add size for standard model (sora2 supports size, sora2pro doesn't need it in wuyinke)
		if (request.model === 'sora2' && request.size) {
			body.size = request.size;
		}

		const response = (await this.ctx.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}${endpoint}?key=${credentials.apiKey}`,
			headers: {
				'Content-Type': 'application/json',
			},
			body,
			json: true,
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
		const credentials = await this.ctx.getCredentials<WuyinkeCredentials>('wuyinkeSora2Api');
		const baseUrl = credentials.apiEndpoint || 'https://api.wuyinkeji.com';

		const response = (await this.ctx.helpers.httpRequest({
			method: 'GET',
			url: `${baseUrl}/api/sora2/detail?key=${credentials.apiKey}&id=${taskId}`,
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
