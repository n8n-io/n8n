/**
 * Base provider class for image generation
 */

import type { IExecuteFunctions } from 'n8n-workflow';

import type {
	Provider,
	ImageGenerationRequest,
	GenerateResult,
	StatusResponse,
} from '../interfaces';

/**
 * Abstract base class for image generation providers
 */
export abstract class BaseImageProvider {
	protected ctx: IExecuteFunctions;
	abstract readonly providerType: Exclude<Provider, 'auto'>;

	constructor(ctx: IExecuteFunctions) {
		this.ctx = ctx;
	}

	/**
	 * Generate an image from the request
	 * This is the main method that providers must implement
	 */
	abstract generate(request: ImageGenerationRequest): Promise<GenerateResult>;

	/**
	 * Submit an async image generation request (for async providers like Wuyinke)
	 * Returns a task ID that can be used to poll for status
	 */
	async submit?(request: ImageGenerationRequest): Promise<{ taskId: string }>;

	/**
	 * Get the status of an async image generation task
	 */
	async getStatus?(taskId: string): Promise<StatusResponse>;

	/**
	 * Wait for an async task to complete
	 * Polls getStatus until completion or timeout
	 */
	async waitForCompletion(
		taskId: string,
		timeoutSec: number = 300,
		intervalSec: number = 5,
	): Promise<StatusResponse> {
		if (!this.getStatus) {
			throw new Error('Provider does not support async operations');
		}

		const startTime = Date.now();
		const timeoutMs = timeoutSec * 1000;
		const intervalMs = intervalSec * 1000;

		while (Date.now() - startTime < timeoutMs) {
			const status = await this.getStatus(taskId);

			if (status.status === 'completed' || status.status === 'failed') {
				return status;
			}

			// Wait before next poll
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}

		return {
			status: 'failed',
			error: `Timeout after ${timeoutSec} seconds waiting for image generation`,
		};
	}

	/**
	 * Download an image from a URL
	 */
	protected async downloadImage(url: string): Promise<Buffer> {
		const response = await this.ctx.helpers.httpRequest({
			method: 'GET',
			url,
			encoding: 'arraybuffer',
			returnFullResponse: false,
		});

		return Buffer.from(response as ArrayBuffer);
	}
}
