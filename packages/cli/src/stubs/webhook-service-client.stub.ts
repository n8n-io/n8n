/**
 * Stub interface for WebhookService API client
 *
 * This will be replaced with actual HTTP/RPC calls to the trigger-service
 * once the service is properly set up as a separate process.
 */

import type { Request, Response } from 'express';

export interface WebhookServiceClient {
	// Webhook execution
	executeWebhook(req: Request, res: Response): Promise<unknown>;
	getWebhookMethods(path: string): Promise<string[]>;
}

/**
 * Temporary stub implementation that throws errors
 */
export class WebhookServiceStub implements WebhookServiceClient {
	async executeWebhook(_req: Request, _res: Response): Promise<unknown> {
		throw new Error('WebhookService API not yet implemented: executeWebhook');
	}

	async getWebhookMethods(_path: string): Promise<string[]> {
		throw new Error('WebhookService API not yet implemented: getWebhookMethods');
	}
}
