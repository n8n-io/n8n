/**
 * Hosts the user chose to keep approved, so repeat sessions skip the connect
 * confirmation. `local`, not `session`, so the choice survives a browser restart. This
 * never widens what may be connected to — `relayAllowlist` still gates every relay URL.
 */

import { getRelayHostKey } from './relayAllowlist';

const APPROVED_HOSTS_KEY = 'approvedRelayHosts';
const APPROVED_ORIGINS_KEY = 'approvedInstanceOrigins';

function getPageOrigin(relayUrl: string | null | undefined): string | null {
	if (!relayUrl) return null;
	try {
		const url = new URL(relayUrl);
		if (url.protocol === 'wss:') url.protocol = 'https:';
		else if (url.protocol === 'ws:') url.protocol = 'http:';
		else return null;
		return url.origin;
	} catch {
		return null;
	}
}

export async function listApprovedHosts(): Promise<string[]> {
	const stored = await chrome.storage.local.get(APPROVED_HOSTS_KEY);
	const value: unknown = stored[APPROVED_HOSTS_KEY];
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
}

export async function isHostApproved(relayUrl: string | null | undefined): Promise<boolean> {
	const host = getRelayHostKey(relayUrl);
	if (!host) return false;
	return (await listApprovedHosts()).includes(host);
}

export async function listApprovedOrigins(): Promise<string[]> {
	const stored = await chrome.storage.local.get(APPROVED_ORIGINS_KEY);
	const value: unknown = stored[APPROVED_ORIGINS_KEY];
	if (Array.isArray(value))
		return value.filter((entry): entry is string => typeof entry === 'string');

	return (await listApprovedHosts()).map((host) => {
		const isLocal = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
		return `${isLocal ? 'http' : 'https'}://${host}`;
	});
}

/** Returns the resulting list, so callers refresh their view without a second read. */
export async function rememberHost(relayUrl: string | null | undefined): Promise<string[]> {
	const host = getRelayHostKey(relayUrl);
	const hosts = await listApprovedHosts();
	if (!host) return hosts;
	const next = hosts.includes(host) ? hosts : [...hosts, host];
	const origin = getPageOrigin(relayUrl);
	const origins = await listApprovedOrigins();
	await chrome.storage.local.set({
		[APPROVED_HOSTS_KEY]: next,
		...(origin && !origins.includes(origin)
			? { [APPROVED_ORIGINS_KEY]: [...origins, origin] }
			: {}),
	});
	return next;
}

export async function forgetApprovedHost(host: string): Promise<string[]> {
	const hosts = await listApprovedHosts();
	if (!hosts.includes(host)) return hosts;
	const next = hosts.filter((entry) => entry !== host);
	const origins = (await listApprovedOrigins()).filter((origin) => {
		try {
			return new URL(origin).host !== host;
		} catch {
			return false;
		}
	});
	await chrome.storage.local.set({
		[APPROVED_HOSTS_KEY]: next,
		[APPROVED_ORIGINS_KEY]: origins,
	});
	return next;
}
