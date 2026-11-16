import type { Request } from 'express';
import type { WebSocket } from 'ws';

export const BROWSER_USE_WS_NAMESPACE = '/browser-use';

export const CDP_TOKEN_HEADER = 'x-n8n-cdp-token';

export const EXTENSION_VERSION_QUERY_PARAM = 'extensionVersion';

const EXTENSION_VERSION_PATTERN = /^\d{1,5}(\.\d{1,5}){0,3}$/;

/** A malformed or absent value reads as "not reported" rather than failing the upgrade. */
export function parseExtensionVersion(value: unknown): string | null {
	if (typeof value !== 'string' || !EXTENSION_VERSION_PATTERN.test(value)) {
		return null;
	}
	return value;
}

export interface BrowserUseUpgradeRequest extends Request {
	ws: WebSocket;
}
