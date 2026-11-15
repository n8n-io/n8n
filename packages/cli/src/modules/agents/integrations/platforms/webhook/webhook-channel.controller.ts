import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, Get, Options, Post, RootLevelController } from '@n8n/decorators';
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

	// SPIKE (agent-chat-embed): @n8n/chat protocol + hosted page. Any origin may call it.
	@Options('/:agentId/chat', { skipAuth: true, allowBots: true, usesTemplates: true, cors: true })
	chatPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	@Post('/:agentId/chat', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: true,
	})
	async chat(req: Request<{ agentId: string }>, res: Response) {
		const body = (req.body ?? {}) as Record<string, unknown>;
		// History is not wired yet: every page load starts a new conversation.
		if (body.action === 'loadPreviousSession') {
			res.json({ data: [] });
			return;
		}
		res.status(200);
		res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();
		for await (const chunk of this.webhookChannel.chat({
			agentId: req.params.agentId,
			body,
			abortSignal: abortOnClose(res),
		})) {
			res.write(JSON.stringify(chunk) + '\n');
			(res as Response & { flush?: () => void }).flush?.();
		}
		res.end();
	}

	@Get('/:agentId/chat', { skipAuth: true, allowBots: true, usesTemplates: true })
	async chatPage(req: Request<{ agentId: string }>, res: Response) {
		const info = await this.webhookChannel.chatPageInfo(req.params.agentId);
		if (!info) {
			res.status(404).send('This agent has no public chat page.');
			return;
		}
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(chatPageHtml(info.name));
	}

	@Post('/:agentId/approvals/:conversationId/:runId/:toolCallId', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
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

const scriptSafe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** SPIKE: the hosted chat page. It loads @n8n/chat from the CDN, as the Chat Trigger does. */
function chatPageHtml(agentName: string) {
	const escaped = agentName.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escaped}</title>
	<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
	<style>html,body,#n8n-chat{height:100%;margin:0}</style>
</head>
<body>
	<div id="n8n-chat"></div>
	<script type="module">
		import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
		createChat({
			webhookUrl: location.pathname,
			mode: 'fullscreen',
			enableStreaming: true,
			loadPreviousSession: false,
			showWelcomeScreen: false,
			initialMessages: [],
			i18n: { en: { title: ${scriptSafe(agentName)}, subtitle: '', inputPlaceholder: 'Type your message…', getStarted: 'New conversation', footer: '', closeButtonTooltip: 'Close' } },
		});
	</script>
</body>
</html>`;
}
