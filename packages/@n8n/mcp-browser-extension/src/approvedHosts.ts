/**
 * Hosts the user chose to keep approved, so repeat sessions skip the connect
 * confirmation. `local`, not `session`, so the choice survives a browser restart. This
 * never widens what may be connected to — `relayAllowlist` still gates every relay URL.
 */

import { getRelayHostKey } from './relayAllowlist';

const APPROVED_HOSTS_KEY = 'approvedRelayHosts';

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

/** Returns the resulting list, so callers refresh their view without a second read. */
export async function rememberHost(relayUrl: string | null | undefined): Promise<string[]> {
	const host = getRelayHostKey(relayUrl);
	const hosts = await listApprovedHosts();
	if (!host || hosts.includes(host)) return hosts;
	const next = [...hosts, host];
	await chrome.storage.local.set({ [APPROVED_HOSTS_KEY]: next });
	return next;
}

export async function forgetApprovedHost(host: string): Promise<string[]> {
	const hosts = await listApprovedHosts();
	if (!hosts.includes(host)) return hosts;
	const next = hosts.filter((entry) => entry !== host);
	await chrome.storage.local.set({ [APPROVED_HOSTS_KEY]: next });
	return next;
}
