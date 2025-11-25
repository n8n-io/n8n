/**
 * Sora2 Batch Video - Base Provider Class
 */

import type { IExecuteFunctions } from 'n8n-workflow';

import type {
	Provider,
	StatusResponse,
	SubmitResponse,
	VideoGenerationRequest,
} from '../interfaces';

/**
 * Abstract base class for Sora2 video generation providers
 */
export abstract class BaseSora2Provider {
	abstract readonly providerType: Provider;

	constructor(protected ctx: IExecuteFunctions) {}

	/**
	 * Submit a video generation request
	 */
	abstract submit(request: VideoGenerationRequest): Promise<SubmitResponse>;

	/**
	 * Get the status of a video generation task
	 */
	abstract getStatus(taskId: string): Promise<StatusResponse>;

	/**
	 * Download a video from URL
	 */
	abstract downloadVideo(videoUrl: string): Promise<Buffer>;

	/**
	 * Wait for a video generation task to complete
	 * Uses polling with configurable timeout and interval
	 */
	async waitForCompletion(
		taskId: string,
		timeoutSec: number,
		intervalSec: number,
	): Promise<StatusResponse> {
		const startTime = Date.now();
		const timeoutMs = timeoutSec * 1000;
		const intervalMs = intervalSec * 1000;

		// Try to get abort signal if available
		let abortSignal: AbortSignal | undefined;
		try {
			abortSignal = this.ctx.getExecutionCancelSignal?.();
		} catch {
			// getExecutionCancelSignal may not be available in all contexts
		}

		while (Date.now() - startTime < timeoutMs) {
			// Check if execution was cancelled
			if (abortSignal?.aborted) {
				throw new Error('Execution was cancelled');
			}

			const status = await this.getStatus(taskId);

			if (status.status === 'completed') {
				return status;
			}

			if (status.status === 'failed') {
				throw new Error(status.error || 'Video generation failed');
			}

			// Wait before next poll
			await this.sleep(intervalMs);
		}

		throw new Error(`Timeout waiting for video generation after ${timeoutSec} seconds`);
	}

	/**
	 * Sleep helper
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
