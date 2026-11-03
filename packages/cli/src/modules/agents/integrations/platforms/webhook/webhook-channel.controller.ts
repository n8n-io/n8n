import { GlobalConfig } from '@n8n/config';
import { Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';

import { WebhookChannelService } from './webhook-channel.service';

/**
 * The public endpoint of the webhook channel. It is a root-level controller, so
 * only mains serve it: webhook processes never activate controllers.
 */
@RootLevelController(`/${Container.get(GlobalConfig).endpoints.agentWebhook}`)
export class WebhookChannelController {
	constructor(private readonly webhookChannel: WebhookChannelService) {}

	// Public route: do not add a scope decorator. The caller is not an n8n user,
	// and the channel's own authentication runs in the service.
	@Post('/:agentId/responses', { skipAuth: true, allowBots: true, usesTemplates: true })
	async respond(req: Request<{ agentId: string }>, res: Response) {
		const abort = new AbortController();
		// A client that disconnects stops the run.
		res.on('close', () => {
			if (!res.writableFinished) abort.abort();
		});

		const reply = await this.webhookChannel.respond({
			agentId: req.params.agentId,
			headers: req.headers,
			body: req.body,
			abortSignal: abort.signal,
		});
		if (!res.headersSent) res.status(reply.status).json(reply.body);
	}
}
