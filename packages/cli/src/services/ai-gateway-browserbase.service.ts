import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { AiGatewayService } from '@/services/ai-gateway.service';

/** Tells the gateway to bill the request to Assistant credits instead of Gateway credits. */
const REQUEST_SOURCE_HEADERS = { 'x-n8n-request-source': 'ai-assistant' };

const SESSIONS_PATH = '/browserbase/v1/sessions';

/** The gateway reads the token from Browserbase's own API key header on Browserbase routes. */
const TOKEN_HEADER = 'x-bb-api-key';

export interface BrowserbaseSession {
	sessionId: string;
	/** CDP WebSocket URL of the session's browser. */
	connectUrl: string;
}

/**
 * Manages Browserbase sessions through the gateway for the AI Assistant's cloud browser.
 * Every call is billed to Assistant credits.
 */
@Service()
export class AiGatewayBrowserbaseService {
	constructor(private readonly aiGatewayService: AiGatewayService) {}

	async createSession(userId: string): Promise<BrowserbaseSession> {
		const response = await this.aiGatewayService.sendGatewayRequestForUser<{
			id?: unknown;
			connectUrl?: unknown;
		}>(
			userId,
			{
				method: 'POST',
				path: SESSIONS_PATH,
				headers: REQUEST_SOURCE_HEADERS,
				tokenHeader: TOKEN_HEADER,
				body: {},
			},
			'Failed to create browser session',
		);

		if (typeof response?.id !== 'string' || typeof response.connectUrl !== 'string') {
			throw new UserError('Gateway credits returned an invalid browser session response.');
		}
		return { sessionId: response.id, connectUrl: response.connectUrl };
	}

	/** URL of a page that shows the session's browser live, and lets the viewer use it. */
	async getLiveViewUrl(userId: string, sessionId: string): Promise<string> {
		const response = await this.aiGatewayService.sendGatewayRequestForUser<{
			debuggerFullscreenUrl?: unknown;
		}>(
			userId,
			{
				method: 'GET',
				path: `${SESSIONS_PATH}/${encodeURIComponent(sessionId)}/debug`,
				headers: REQUEST_SOURCE_HEADERS,
				tokenHeader: TOKEN_HEADER,
			},
			'Failed to get browser live view',
		);

		if (typeof response?.debuggerFullscreenUrl !== 'string') {
			throw new UserError('Gateway credits returned an invalid browser live view response.');
		}
		return response.debuggerFullscreenUrl;
	}

	async releaseSession(userId: string, sessionId: string): Promise<void> {
		await this.aiGatewayService.sendGatewayRequestForUser(
			userId,
			{
				method: 'POST',
				path: `${SESSIONS_PATH}/${encodeURIComponent(sessionId)}`,
				headers: REQUEST_SOURCE_HEADERS,
				tokenHeader: TOKEN_HEADER,
				body: { status: 'REQUEST_RELEASE' },
			},
			'Failed to release browser session',
		);
	}
}
