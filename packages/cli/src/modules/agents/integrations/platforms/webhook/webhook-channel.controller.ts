import { AgentIngressConfig, AgentsConfig, GlobalConfig } from '@n8n/config';
import {
	createIpRateLimit,
	createParamKeyedRateLimiter,
	Post,
	RootLevelController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';

import { responsesApiRateLimitBody } from './responses-api';
import { WebhookChannelIngressService } from './webhook-channel-ingress.service';
import type { WebhookChannelReply } from './webhook-channel.service';

const agentsConfig = Container.get(AgentsConfig);
const ingressConfig = Container.get(AgentIngressConfig);

const rateLimits = {
	ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
	keyedRateLimit: createParamKeyedRateLimiter({
		param: 'agentId',
		limit: ingressConfig.webhookChannelAgentRateLimit,
	}),
	// Callers use OpenAI clients, so a 429 has the OpenAI error shape.
	rateLimitBody: responsesApiRateLimitBody,
};

/**
 * The public endpoint of the webhook channel. It is on the agent ingress
 * surface, so mains or webhook processes serve it, see `AgentIngressPolicy`.
 * In queue mode, its rate limits count in Redis for all of them.
 */
@RootLevelController(`/${Container.get(GlobalConfig).endpoints.agentWebhook}`, {
	surface: 'agent-ingress',
})
export class WebhookChannelController {
	constructor(private readonly webhookChannel: WebhookChannelIngressService) {}

	// Public routes: do not add a scope decorator. The caller is not an n8n user,
	// and the channel's own authentication runs in the service.
	@Post('/:agentId/responses', {
		...rateLimits,
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
		send(res, reply);
	}

	@Post('/:agentId/approvals/:conversationId/:runId/:toolCallId', {
		...rateLimits,
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
		send(res, reply);
	}
}

function send(res: Response, reply: WebhookChannelReply) {
	if (res.headersSent) return;
	if (reply.retryAfterSeconds !== undefined) {
		res.setHeader('Retry-After', String(reply.retryAfterSeconds));
	}
	res.status(reply.status).json(reply.body);
}

/** A client that disconnects stops the run. */
function abortOnClose(res: Response) {
	const abort = new AbortController();
	res.on('close', () => {
		if (!res.writableFinished) abort.abort();
	});
	return abort.signal;
}
