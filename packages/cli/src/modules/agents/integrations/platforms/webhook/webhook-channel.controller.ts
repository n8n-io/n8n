import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, Get, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import path from 'node:path';

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

	// SPIKE (agent-chat-embed): routes of @n8n/agent-chat. Any origin may call them.
	@Get('/assets/:file', { skipAuth: true, allowBots: true, usesTemplates: true })
	chatAsset(req: Request<{ file: string }>, res: Response) {
		const file = CHAT_ASSETS[req.params.file];
		if (!file) {
			res.status(404).end();
			return;
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Cache-Control', 'no-cache');
		res.type(file.type).sendFile(file.path);
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

	@Options('/:agentId/chat/config', { skipAuth: true, allowBots: true, usesTemplates: true, cors: true })
	chatConfigPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	@Get('/:agentId/chat/config', { skipAuth: true, allowBots: true, usesTemplates: true, cors: true })
	async chatConfig(req: Request<{ agentId: string }>, res: Response) {
		const info = await this.webhookChannel.chatPageInfo(req.params.agentId);
		if (!info) res.status(404).json({ message: 'This agent has no public chat' });
		else res.json({ name: info.name });
	}

	@Options('/:agentId/chat/messages', { skipAuth: true, allowBots: true, usesTemplates: true, cors: true })
	chatPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	@Post('/:agentId/chat/messages', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: true,
	})
	async chatMessage(req: Request<{ agentId: string }>, res: Response) {
		res.status(200);
		res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();
		for await (const event of this.webhookChannel.chat({
			agentId: req.params.agentId,
			body: req.body,
			abortSignal: abortOnClose(res),
		})) {
			res.write(JSON.stringify(event) + '\n');
			(res as Response & { flush?: () => void }).flush?.();
		}
		res.end();
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

// The bundle of @n8n/agent-chat, served by the instance (no CDN).
const chatDist = path.join(path.dirname(require.resolve('@n8n/agent-chat/package.json')), 'dist');
const CHAT_ASSETS: Record<string, { path: string; type: string }> = {
	'agent-chat.js': { path: path.join(chatDist, 'agent-chat.js'), type: 'application/javascript' },
	'agent-chat.css': { path: path.join(chatDist, 'agent-chat.css'), type: 'text/css' },
};

/** SPIKE: the hosted chat page. It mounts @n8n/agent-chat in full-screen mode. */
function chatPageHtml(agentName: string) {
	const escape = (value: string) => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escape(agentName)}</title>
</head>
<body>
	<script src="../assets/agent-chat.js" data-agent-url="${escape('./chat')}" data-mode="fullscreen"></script>
</body>
</html>`;
}
