// Relay hosts the extension is permitted to connect to.
const N8N_CLOUD_SUFFIXES = ['.app.n8n.cloud', '.stage-app.n8n.cloud'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseRelayUrl(url: string | null | undefined): URL | null {
	if (!url) return null;
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

function getHostname(url: string | null | undefined): string | null {
	return parseRelayUrl(url)?.hostname ?? null;
}

/**
 * The identity of a relay everywhere it is stored or shown: hostname plus port, with the
 * protocol's default port omitted. Two local instances stay distinct; cloud hosts read
 * unchanged.
 */
export function getRelayHostKey(url: string | null | undefined): string | null {
	return parseRelayUrl(url)?.host ?? null;
}

export function isLocalhostRelay(url: string | null | undefined): boolean {
	const host = getHostname(url);
	return host !== null && LOCAL_HOSTS.has(host);
}

export function isAllowedRelayUrl(url: string | null | undefined): boolean {
	const parsed = parseRelayUrl(url);
	if (!parsed) return false;
	if (parsed.protocol === 'wss:') return isAllowedHost(parsed.hostname);
	// Plaintext only where there is no network to intercept.
	return parsed.protocol === 'ws:' && LOCAL_HOSTS.has(parsed.hostname);
}

export function isAllowedPageOrigin(origin: string | null | undefined): boolean {
	const parsed = parseRelayUrl(origin);
	if (!parsed) return false;
	if (parsed.protocol === 'https:') return isAllowedHost(parsed.hostname);
	return parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname);
}

function isAllowedHost(host: string): boolean {
	if (LOCAL_HOSTS.has(host)) return true;
	return N8N_CLOUD_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}
