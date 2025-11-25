/**
 * Sora2 Batch Video - ttapi.io Provider
 */

import type {
	StatusResponse,
	SubmitResponse,
	TtapiCredentials,
	TtapiFetchResponse,
	TtapiSubmitResponse,
	VideoGenerationRequest,
} from '../interfaces';
import { BaseSora2Provider } from './base.provider';

/**
 * ttapi.io provider implementation
 */
export class TtapiProvider extends BaseSora2Provider {
	readonly providerType = 'ttapi' as const;

	/**
	 * Submit a video generation request to ttapi.io
	 */
	async submit(request: VideoGenerationRequest): Promise<SubmitResponse> {
		const credentials = await this.ctx.getCredentials<TtapiCredentials>('ttapiSora2Api');
		const baseUrl = credentials.apiEndpoint || 'https://api.ttapi.io';

		// Build request body according to ttapi.io API
		const body: Record<string, unknown> = {
			model: request.model === 'sora2pro' ? 'sora-2-pro' : 'sora-2',
			prompt: request.prompt,
			orientation: request.aspectRatio === '9:16' ? 'portrait' : 'landscape',
			duration: request.duration,
		};

		// Add size for pro model
		if (request.model === 'sora2pro' && request.size) {
			body.size = request.size;
		}

		// Add reference image for image2video
		if (request.referenceImageUrl) {
			body.referImages = [request.referenceImageUrl];
		}

		const response = (await this.ctx.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/sora/generations`,
			headers: {
				'TT-API-KEY': credentials.apiKey,
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		})) as TtapiSubmitResponse;

		const taskId = response.data?.jobId || response.jobId;
		if (!taskId) {
			throw new Error(
				`Failed to submit video generation: ${response.message || 'No job ID returned'}`,
			);
		}

		return {
			taskId,
			provider: 'ttapi',
		};
	}

	/**
	 * Get the status of a video generation task
	 */
	async getStatus(taskId: string): Promise<StatusResponse> {
		const credentials = await this.ctx.getCredentials<TtapiCredentials>('ttapiSora2Api');
		const baseUrl = credentials.apiEndpoint || 'https://api.ttapi.io';

		const response = (await this.ctx.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/sora/fetch`,
			headers: {
				'TT-API-KEY': credentials.apiKey,
				'Content-Type': 'application/json',
			},
			body: { jobId: taskId },
			json: true,
		})) as TtapiFetchResponse;

		// Map ttapi.io status to our standard status
		const rawStatus = (response.data?.status || response.status || '').toLowerCase();
		const statusMap: Record<string, StatusResponse['status']> = {
			pending: 'pending',
			queued: 'pending',
			processing: 'processing',
			running: 'processing',
			completed: 'completed',
			success: 'completed',
			failed: 'failed',
			error: 'failed',
		};

		return {
			taskId,
			status: statusMap[rawStatus] || 'pending',
			videoUrl: response.data?.videoUrl || response.videoUrl,
			error: response.data?.error || response.data?.message,
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
