import { Get, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InstanceAiBrowserSessionService } from '@/modules/instance-ai/browser/instance-ai-browser-session.service';

import { AgentBrowserSetupTokenService } from './agent-browser-setup-token.service';
import { isBrowserUseAvailable } from './browser-use-availability';

/**
 * Backs the public Browser Use setup page.
 *
 * These routes are deliberately unauthenticated: the person the agent asks to
 * connect a browser may be a Slack user with no n8n account. The setup token is
 * the capability — it is unguessable, short-lived, and resolves to exactly one
 * browser session, so it grants nothing beyond attaching a browser to the
 * conversation that produced it.
 */
@RestController('/agent-browser-use')
export class AgentBrowserUseController {
	constructor(
		private readonly setupTokens: AgentBrowserSetupTokenService,
		private readonly browserSessions: InstanceAiBrowserSessionService,
	) {}

	/**
	 * Mint the extension's connect URL for this session.
	 *
	 * `createLink` rotates the session's relay token, so it is called here —
	 * when the user actually opens the page — rather than when the agent hands
	 * out the link. Otherwise a second tool call would silently invalidate the
	 * link the user was part way through using.
	 */
	@Get('/connect-link', { skipAuth: true })
	async getConnectLink(req: Request, _res: Response) {
		const sessionKey = await this.resolveSessionKey(req);
		const { connectUrl, expiresAt } = await this.browserSessions.createLink(sessionKey);
		return { connectUrl, expiresAt };
	}

	@Get('/status', { skipAuth: true })
	async getStatus(req: Request, _res: Response) {
		const sessionKey = await this.resolveSessionKey(req);
		return { connected: this.browserSessions.getStatus(sessionKey).connected };
	}

	/**
	 * An unknown, expired or unavailable token is reported the same way, so the
	 * endpoint cannot be used to probe which tokens exist.
	 */
	private async resolveSessionKey(req: Request): Promise<string> {
		const token = typeof req.query.token === 'string' ? req.query.token : null;
		const sessionKey = token ? this.setupTokens.resolve(token) : null;
		if (!sessionKey || !(await isBrowserUseAvailable())) {
			throw new NotFoundError('This Browser Use setup link is no longer valid.');
		}
		return sessionKey;
	}
}
