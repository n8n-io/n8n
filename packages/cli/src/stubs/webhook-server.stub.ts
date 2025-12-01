import { Service } from '@n8n/di';
import type { Server } from 'http';

/**
 * Stub for WebhookServer - functionality moved to @n8n/trigger-service
 */
@Service()
export class WebhookServer {
	server?: Server;

	async start(): Promise<void> {
		throw new Error(
			'WebhookServer functionality moved to @n8n/trigger-service - not yet implemented',
		);
	}

	async stop(): Promise<void> {
		throw new Error(
			'WebhookServer functionality moved to @n8n/trigger-service - not yet implemented',
		);
	}
}
