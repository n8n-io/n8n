import type { Request } from 'express';
import type { WebSocket } from 'ws';

export const BROWSER_USE_WS_NAMESPACE = '/browser-use';

export const CDP_TOKEN_HEADER = 'x-n8n-cdp-token';

export interface BrowserUseUpgradeRequest extends Request {
	ws: WebSocket;
}
