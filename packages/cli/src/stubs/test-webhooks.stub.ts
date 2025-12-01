import { Service } from '@n8n/di';

/**
 * Stub for TestWebhooks service - functionality moved to @n8n/trigger-service
 */
@Service()
export class TestWebhooks {
	async needsWebhook(_options: unknown): Promise<boolean> {
		return false;
	}

	cancelWebhook(_executionId: string): Promise<unknown> {
		throw new Error(
			'TestWebhooks functionality moved to @n8n/trigger-service - not yet implemented',
		);
	}
}
