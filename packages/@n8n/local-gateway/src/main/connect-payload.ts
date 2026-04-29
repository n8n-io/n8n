import type { ConnectPayload } from '../shared/types';

/** Custom URI scheme registered with the OS for deep links (`n8n-gateway://…`). */
export const DEEP_LINK_PROTOCOL = 'n8n-gateway';

/**
 * Parses `n8n-gateway://connect?url=…&token=…` deep links (strict: host must be `connect`).
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
	try {
		new URL(url);
	} catch {
		return null;
	}

	return { url, apiKey };
}

/** Returns the first argv element that parses as a valid connect payload. */
export function parseConnectPayloadFromArgv(argv: string[]): ConnectPayload | null {
	for (const arg of argv) {
		const payload = parseConnectPayload(arg);
		if (payload) return payload;
	}
	return null;
}
