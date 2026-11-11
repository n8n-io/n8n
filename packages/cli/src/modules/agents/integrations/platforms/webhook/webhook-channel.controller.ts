import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';

import { WebhookChannelService } from './webhook-channel.service';

const agentsConfig = Container.get(AgentsConfig);

/**
 * The public endpoint of the webhook channel. It is a root-level controller, so
 * only mains serve it: webhook processes never activate controllers.
 */
@RootLevelController(`/${Container.get(GlobalConfig).endpoints.agentWebhook}`)
export class WebhookChannelController {
	constructor(private readonly webhookChannel: WebhookChannelService) {}

	// Public routes: do not add a scope decorator. The caller is not an n8n user,
	// and the channel's own authentication runs in the service.
	@Post('/:agentId/responses', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
	})
	async respond(req: Request<{ agentId: string }>, res: Response) {
		const reply = await this.webhookChannel.respond({
			agentId: req.params.agentId,
			headers: req.headers,
			body: req.body,
			abortSignal: abortOnClose(res),
		});
		if (!res.headersSent) res.status(reply.status).json(reply.body);
	}

	@Post('/:agentId/approvals/:conversationId/:runId/:toolCallId', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
	})
	async decide(
		req: Request<{ agentId: string; conversationId: string; runId: string; toolCallId: string }>,
		res: Response,
	) {
		const reply = await this.webhookChannel.decide({
			...req.params,
			headers: req.headers,
			body: req.body,
			abortSignal: abortOnClose(res),
		});
		if (!res.headersSent) res.status(reply.status).json(reply.body);
	}
}

/** A client that disconnects stops the run. */
function abortOnClose(res: Response) {
	const abort = new AbortController();
	res.on('close', () => {
		if (!res.writableFinished) abort.abort();
	});
	return abort.signal;
}
