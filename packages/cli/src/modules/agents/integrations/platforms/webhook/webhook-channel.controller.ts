import { UrlService } from '@n8n/backend-services';
import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, Get, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';

import { ChatPageInviteService } from './chat-page-invites.service';
import { WebhookChannelService, type ChatPageUser } from './webhook-channel.service';

const agentsConfig = Container.get(AgentsConfig);
const globalConfig = Container.get(GlobalConfig);

// SPIKE (agent-chat-embed): any origin; the widget sends its chat token as a bearer header.
const CHAT_CORS = {
	allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-N8n-Chat'],
};
// Opaque session of a magic-link recipient (hosted page only).
const SESSION_COOKIE = 'n8n-chat-session';
const REQUEST_ID = /^[A-Za-z0-9_-]{20,100}$/;
const TOKEN_TTL = 60 * 60 * 1000;
const REQUEST_TTL = 3 * 60 * 1000;
const chatTokens = new Map<
	string,
	{ user: ChatPageUser; agentId: string; expires: number; issued: number }
>();
const loginRequests = new Map<string, { token: string; user: ChatPageUser; expires: number }>();

/**
 * The public endpoint of the webhook channel. It is a root-level controller, so
 * only mains serve it: webhook processes never activate controllers.
 */
@RootLevelController(`/${globalConfig.endpoints.agentWebhook}`)
export class WebhookChannelController {
	constructor(
		private readonly webhookChannel: WebhookChannelService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
		private readonly invites: ChatPageInviteService,
	) {}

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
		const page = await this.webhookChannel.chatPage(req.params.agentId);
		if (!page) {
			res.status(404).send('This agent has no chat page.');
			return;
		}
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(chatPageHtml(page.agent.name));
	}

	@Options('/:agentId/chat/config', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	chatConfigPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	@Get('/:agentId/chat/config', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	async chatConfig(req: Request<{ agentId: string }>, res: Response) {
		const { agentId } = req.params;
		const page = await this.webhookChannel.chatPage(agentId);
		if (!page) {
			res.status(404).json({ message: 'This agent has no chat page' });
			return;
		}
		const chatUrl = `${this.urlService.getAgentWebhookUrl(agentId)}/chat`;
		const user = await this.chatUser(req);
		res.json({
			name: page.agent.name,
			methods: page.surface.methods,
			user: user ? { name: user.name, kind: user.kind } : null,
			// Hosted page: same origin, so the n8n cookie works after a normal sign-in.
			signInUrl: this.signInUrl(chatUrl),
			// Embed: a popup signs in on the instance, the widget polls for a token.
			loginUrl: `${chatUrl}/login`,
		});
	}

	@Options('/:agentId/chat/messages', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	chatPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	@Post('/:agentId/chat/messages', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	async chatMessage(req: Request<{ agentId: string }>, res: Response) {
		if (!(await this.webhookChannel.chatPage(req.params.agentId))) {
			res.status(404).json({ code: 'agent_not_found', message: 'This agent has no chat page.' });
			return;
		}
		const user = await this.chatUser(req);
		res.status(200);
		res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();
		for await (const event of this.webhookChannel.chat({
			agentId: req.params.agentId,
			body: req.body,
			user,
			abortSignal: abortOnClose(res),
		})) {
			res.write(JSON.stringify(event) + '\n');
			(res as Response & { flush?: () => void }).flush?.();
		}
		res.end();
	}

	/**
	 * SPIKE: the popup of the embed sign-in. It runs first-party on the instance,
	 * so the n8n cookie works whatever the browser does with third-party cookies.
	 * Signed in: it parks a short-lived chat token under the widget's request id.
	 * Not signed in: it goes through the normal sign-in page and comes back.
	 */
	@Get('/:agentId/chat/login', { skipAuth: true, allowBots: true, usesTemplates: true })
	async chatLogin(
		req: Request<{ agentId: string }, unknown, unknown, { request?: string }>,
		res: Response,
	) {
		const { agentId } = req.params;
		const requestId = req.query.request ?? '';
		const page = await this.webhookChannel.chatPage(agentId);
		if (!page?.surface.methods.n8nUsers) {
			res.status(404).send('Sign-in with n8n is not enabled for this chat.');
			return;
		}
		if (!REQUEST_ID.test(requestId)) {
			res.status(400).send('Invalid sign-in request.');
			return;
		}
		const user = await this.cookieUser(req);
		if (!user) {
			const back = `${this.urlService.getAgentWebhookUrl(agentId)}/chat/login?request=${requestId}`;
			res.redirect(this.signInUrl(back));
			return;
		}
		// ponytail: in-memory, single main only; the product stores tokens in the DB (or signs them).
		const token = randomBytes(32).toString('base64url');
		chatTokens.set(token, { user, agentId, expires: Date.now() + TOKEN_TTL, issued: Date.now() });
		loginRequests.set(requestId, { token, user, expires: Date.now() + REQUEST_TTL });
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(loginDoneHtml(user.name));
	}

	@Options('/:agentId/chat/login/:requestId', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	chatLoginPreflight(_req: Request, res: Response) {
		res.status(204).end();
	}

	/** SPIKE: the widget polls here until the popup has signed in. Hands the token out once. */
	@Post('/:agentId/chat/login/:requestId', {
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
		cors: CHAT_CORS,
	})
	chatLoginPoll(req: Request<{ agentId: string; requestId: string }>, res: Response) {
		const entry = loginRequests.get(req.params.requestId);
		if (!entry || entry.expires < Date.now()) {
			res.status(202).json({ status: 'pending' });
			return;
		}
		loginRequests.delete(req.params.requestId);
		res.json({ token: entry.token, user: { name: entry.user.name } });
	}

	/**
	 * SPIKE: exchanges a magic link token (from the URL fragment) for a recipient
	 * session. If the browser already chats as someone else, it answers 409 and the
	 * page asks before it replaces that session.
	 */
	@Post('/:agentId/chat/invite', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
	})
	async chatInvite(req: Request<{ agentId: string }>, res: Response) {
		const { agentId } = req.params;
		if (!isSameOriginChatCall(req)) {
			res.status(403).json({ code: 'forbidden', message: 'Open the link in the chat page.' });
			return;
		}
		const body = (req.body ?? {}) as { token?: unknown; replace?: unknown };
		const token = typeof body.token === 'string' ? body.token : '';
		const page = await this.webhookChannel.chatPage(agentId);
		if (!page) {
			res.status(404).json({ code: 'agent_not_found', message: 'This agent has no chat page.' });
			return;
		}
		if (!page.surface.methods.magicLinks) {
			res
				.status(403)
				.json({ code: 'method_disabled', message: 'Invite links are not enabled for this chat.' });
			return;
		}
		const checked = await this.invites.check(agentId, token);
		if (typeof checked === 'string') {
			res.status(checked === 'invite_invalid' ? 404 : 410).json(inviteError(checked));
			return;
		}
		const current = await this.chatUser(req);
		if (current && current.key !== `invite-${checked.id}` && body.replace !== true) {
			res.status(409).json({ code: 'session_exists', current: current.name, label: checked.label });
			return;
		}
		const result = await this.invites.exchange(agentId, token);
		if (typeof result === 'string') {
			res.status(410).json(inviteError(result));
			return;
		}
		res.cookie(SESSION_COOKIE, result.session, {
			httpOnly: true,
			sameSite: 'lax',
			secure: globalConfig.auth.cookie.secure,
			path: chatCookiePath(agentId),
			maxAge: Date.parse(result.invite.expiresAt) - Date.now(),
		});
		res.json({ user: { name: result.invite.label, kind: 'invite' } });
	}

	/** SPIKE: ends a magic-link session on this browser. */
	@Post('/:agentId/chat/logout', { skipAuth: true, allowBots: true, usesTemplates: true })
	async chatLogout(req: Request<{ agentId: string }>, res: Response) {
		if (!isSameOriginChatCall(req)) {
			res.status(403).end();
			return;
		}
		const session = readCookie(req, SESSION_COOKIE);
		if (session) await this.invites.endSession(session);
		res.clearCookie(SESSION_COOKIE, { path: chatCookiePath(req.params.agentId) });
		res.status(204).end();
	}

	/**
	 * The chat user: a widget token first (embed), then cookies (hosted page).
	 * Cookies count only on same-origin calls with the chat header, so a page on
	 * another site cannot ride on them (security proposal [H2]). Only identities of
	 * enabled methods count, and sessions issued before a method was turned off are dead.
	 */
	private async chatUser(req: Request<{ agentId: string }>): Promise<ChatPageUser | undefined> {
		const { agentId } = req.params;
		const { methods, revokedBefore = {} } = await this.webhookChannel.chatSurface(agentId);
		const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
		if (bearer) {
			const entry = chatTokens.get(bearer);
			const valid =
				methods.n8nUsers &&
				entry?.agentId === agentId &&
				entry.expires > Date.now() &&
				entry.issued > (revokedBefore.n8nUsers ?? 0);
			return valid ? entry.user : undefined;
		}
		if (!isSameOriginChatCall(req)) return undefined;
		const session = readCookie(req, SESSION_COOKIE);
		if (session && methods.magicLinks) {
			const notBefore = revokedBefore.magicLinks ?? 0;
			const invited = await this.invites.sessionUser(agentId, session, notBefore);
			if (invited) return invited;
		}
		return methods.n8nUsers ? await this.cookieUser(req) : undefined;
	}

	private async cookieUser(req: Request): Promise<ChatPageUser | undefined> {
		const cookie = readCookie(req, AUTH_COOKIE_NAME);
		if (!cookie) return undefined;
		try {
			const person = await this.authService.authenticateUserByCookie(cookie);
			const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || person.email;
			return { key: `user-${person.id}`, kind: 'n8n-user', name };
		} catch {
			return undefined;
		}
	}

	private signInUrl(returnTo: string) {
		return `${this.urlService.getInstanceBaseUrl()}/signin?redirect=${encodeURIComponent(returnTo)}`;
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

function readCookie(req: Request, name: string): string | undefined {
	return (req.cookies as Record<string, string> | undefined)?.[name];
}

/** The widget's own calls: chat header set, and same-origin when the browser says so. */
function isSameOriginChatCall(req: Request) {
	const site = req.headers['sec-fetch-site'];
	return req.headers['x-n8n-chat'] === '1' && (site === undefined || site === 'same-origin');
}

const chatCookiePath = (agentId: string) =>
	`/${globalConfig.endpoints.agentWebhook}/${encodeURIComponent(agentId)}/chat`;

const INVITE_ERRORS = {
	invite_invalid: 'This link is not valid. Ask the owner for a new one.',
	invite_expired: 'This link has expired. Ask the owner for a new one.',
	invite_revoked: 'This link was revoked. Ask the owner for a new one.',
};
const inviteError = (code: keyof typeof INVITE_ERRORS) => ({ code, message: INVITE_ERRORS[code] });

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

/** SPIKE: what the sign-in popup shows once it has handed the token over. */
function loginDoneHtml(userName: string) {
	const escape = (value: string) => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Signed in</title></head>
<body style="font-family: system-ui, sans-serif; padding: 24px">
	<p data-testid="chat-login-done">Signed in as <strong>${escape(userName)}</strong>. You can close this window and go back to the chat.</p>
	<script>window.close()</script>
</body>
</html>`;
}

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
	<script src="../assets/agent-chat.js" data-agent-url="${escape('./chat')}" data-mode="fullscreen" data-theme="n8n"></script>
</body>
</html>`;
}
