import type { Request } from 'express';
import type { WebSocket } from 'ws';

/** URL namespace for Browser Use WebSocket endpoints served by the main n8n server. */
export const BROWSER_USE_WS_NAMESPACE = '/browser-use';

/** Header carrying the per-session token on the CDP (server-side client) endpoint. */
export const CDP_TOKEN_HEADER = 'x-n8n-cdp-token';

/** A Browser Use WebSocket upgrade routed through Express, with the socket attached. */
export interface BrowserUseUpgradeRequest extends Request {
	ws: WebSocket;
}
