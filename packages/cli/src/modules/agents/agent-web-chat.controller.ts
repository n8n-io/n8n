import {
	AgentWebChatMessageDto,
	AgentWebChatResumeDto,
	type AgentWebChatPageConfig,
	type AgentWebChatSessionResponse,
	type AgentWebChatSseEvent,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Body, Get, Param, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AuthService } from '@/auth/auth.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { AgentWebChatService } from './agent-web-chat.service';
import { initSseStream, type FlushableResponse } from './agent-sse-stream';

/**
 * The public surface of the web channel.
 *
 * The page itself is not here: `/web-agent/:integrationId` falls through to the
 * frontend, which renders the chat with the same components Agent Preview uses.
 * These routes are the data behind it.
 *
 * Every route re-resolves the channel from the `integrationId` in the URL and
 * re-applies its access mode. Nothing is carried over from an earlier request
 * except the session token, so unpublishing an agent or tightening its access
 * mode takes effect on the very next request.
 */
@RootLevelController('/web-agent')
export class AgentWebChatController {
	constructor(
		private readonly webChatService: AgentWebChatService,
		private readonly authService: AuthService,
	) {}

	/**
	 * What the page may show before anyone has authenticated.
	 *
	 * Deliberately answerable without credentials: the page needs the access mode
	 * to know whether to ask for any, and a title to render while it does. It
	 * carries nothing a visitor could not already infer from being sent the link.
	 */
	@Get('/:integrationId/config', { skipAuth: true })
	async config(
		_req: Request,
		_res: Response,
		@Param('integrationId') integrationId: string,
	): Promise<AgentWebChatPageConfig> {
		const channel = await this.webChatService.resolveChannel(integrationId);
		return this.webChatService.pageConfig(channel);
	}

	/**
	 * Open a visitor session.
	 *
	 * This is where authentication happens, once per session, so a turn does not
	 * pay for a credential decrypt or a scope lookup.
	 */
	@Post('/:integrationId/session', { skipAuth: true })
	async session(
		req: Request,
		res: Response,
		@Param('integrationId') integrationId: string,
	): Promise<AgentWebChatSessionResponse> {
		const channel = await this.webChatService.resolveChannel(integrationId);
		const { userId } = await this.webChatService.authorize(channel, {
			basicAuthHeader: req.headers.authorization,
			...(channel.settings.accessMode === 'n8nUserAuth'
				? { n8nUser: await this.resolveN8nUser(req, res) }
				: {}),
		});

		const sessionId = randomUUID();
		return {
			token: this.webChatService.issueSession(channel, sessionId, userId),
			sessionId,
			config: this.webChatService.pageConfig(channel),
		};
	}

	/** Run one visitor turn, streamed as SSE. */
	@Post('/:integrationId/chat', { skipAuth: true, usesTemplates: true })
	async chat(
		req: Request,
		res: FlushableResponse,
		@Param('integrationId') integrationId: string,
		@Body payload: AgentWebChatMessageDto,
	): Promise<void> {
		const channel = await this.webChatService.resolveChannel(integrationId);
		const session = this.webChatService.verifySession(bearerToken(req), integrationId);
		this.assertSessionMatchesBody(session.sessionId, payload.sessionId);

		const { send } = initSseStream<AgentWebChatSseEvent>(res);
		const abortController = new AbortController();
		const abortOnClose = () => abortController.abort();
		res.once('close', abortOnClose);

		try {
			for await (const event of this.webChatService.streamTurn({
				channel,
				session,
				message: payload.message,
				abortSignal: abortController.signal,
			})) {
				send(event);
			}
		} finally {
			res.off('close', abortOnClose);
			res.end();
		}
	}

	/** Resume a suspended HITL tool call, streamed as SSE. */
	@Post('/:integrationId/chat/resume', { skipAuth: true, usesTemplates: true })
	async resume(
		req: Request,
		res: FlushableResponse,
		@Param('integrationId') integrationId: string,
		@Body payload: AgentWebChatResumeDto,
	): Promise<void> {
		const channel = await this.webChatService.resolveChannel(integrationId);
		const session = this.webChatService.verifySession(bearerToken(req), integrationId);
		this.assertSessionMatchesBody(session.sessionId, payload.sessionId);

		const { send } = initSseStream<AgentWebChatSseEvent>(res);
		const abortController = new AbortController();
		const abortOnClose = () => abortController.abort();
		res.once('close', abortOnClose);

		try {
			for await (const event of this.webChatService.resumeTurn({
				channel,
				session,
				runId: payload.runId,
				toolCallId: payload.toolCallId,
				resumeData: payload.resumeData,
				abortSignal: abortController.signal,
			})) {
				send(event);
			}
		} finally {
			res.off('close', abortOnClose);
			res.end();
		}
	}

	/**
	 * The token names the session; the body only repeats it. They must agree, so
	 * a visitor cannot post into a thread their token was not minted for.
	 */
	private assertSessionMatchesBody(fromToken: string, fromBody: string): void {
		if (fromToken !== fromBody) {
			throw new UnauthenticatedError('Invalid session');
		}
	}

	/**
	 * Resolve the signed-in n8n user from the request cookie.
	 *
	 * These routes skip the auth middleware, because two of the three access
	 * modes have no n8n user at all. `n8nUserAuth` therefore does the same
	 * cookie check here, and a missing or stale cookie simply means "no user" —
	 * the service turns that into the 401.
	 */
	private async resolveN8nUser(req: Request, res: Response): Promise<User | undefined> {
		const token = this.authService.getCookieToken(req);
		if (!token) return undefined;
		try {
			const [user] = await this.authService.resolveJwt(
				token,
				req as AuthenticatedRequest,
				res,
			);
			return user;
		} catch {
			return undefined;
		}
	}
}

/** Read `Authorization: Bearer <token>`. */
function bearerToken(req: Request): string | undefined {
	const header = req.headers.authorization;
	if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
	return header.slice(7).trim();
}
