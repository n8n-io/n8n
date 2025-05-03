import { Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import get from 'lodash/get';

import { WebhookService } from './webhook.service';
import type { Method } from './webhook.types';

@RestController('/webhooks')
export class WebhooksController {
	constructor(private readonly webhookService: WebhookService) {}

	@Post('/find')
	async findWebhook(req: Request) {
		const body = get(req, 'body', {}) as { path: string; method: Method };

		try {
			const webhook = await this.webhookService.findWebhook(body.method, body.path);
			return webhook;
		} catch (error) {
			return null;
		}
	}
}
