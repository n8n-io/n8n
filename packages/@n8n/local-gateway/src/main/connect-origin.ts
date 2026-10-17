import { isOriginAllowed } from '@n8n/computer-use/config';

import type { StatusSnapshot } from '../shared/types';

/**
 * Throws if the normalized instance URL's origin is not allowed by the configured patterns.
 * Call before constructing GatewayClient (deep link / IPC connect).
 */
export function assertConnectOriginAllowed(url: string, allowedOriginPatterns: string[]): void {
	let origin: string;
	try {
		origin = new URL(url.replace(/\/$/, '')).origin;
	} catch {
		throw new Error('Invalid instance URL.');
	}
	if (!isOriginAllowed(origin, allowedOriginPatterns)) {
		throw new Error(
			'This instance URL is not in your allowed origins list. Open Settings and add its origin, or use a deeplink from your trusted n8n.',
		);
	}
}

/** True when the gateway already has a live connection to this instance URL. */
export function isAlreadyConnectedTo(url: string, snapshot: StatusSnapshot): boolean {
	return snapshot.status === 'connected' && snapshot.connectedUrl === url.replace(/\/$/, '');
}
