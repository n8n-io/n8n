import type { ConnectPayload } from '../shared/types';

/** Registered with the OS for deeplinks (`n8n-computer-use://…`). */
export const DEEP_LINK_PROTOCOL = 'n8n-computer-use';

/**
 * Parses `n8n-computer-use://connect?url=…&token=…`. Host must be `connect`. Requires non-empty `token=` after trim.
 */
export function parseConnectPayload(value: string): ConnectPayload | null {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return null;
	}

	if (parsed.protocol !== `${DEEP_LINK_PROTOCOL}:`) return null;
	if (parsed.hostname !== 'connect') return null;

	const url = parsed.searchParams.get('url') ?? '';
	const rawToken = parsed.searchParams.get('token');
	const apiKey = rawToken === null || rawToken.trim().length === 0 ? undefined : rawToken.trim();
	if (!url) return null;
	if (!apiKey) return null;
	try {
		new URL(url);
	} catch {
		return null;
	}

	return { url, apiKey };
}

/** True if argv appears to include our deeplink scheme (even when parse fails). */
export function deepLinkProtocolsInArgv(argv: string[]): boolean {
	const needle = `${DEEP_LINK_PROTOCOL}://`;
	return argv.some((arg) => arg.includes(needle));
}

/** Returns the first argv element that parses as a valid connect payload. */
export function parseConnectPayloadFromArgv(argv: string[]): ConnectPayload | null {
	for (const arg of argv) {
		const payload = parseConnectPayload(arg);
		if (payload) return payload;
	}
	return null;
}
