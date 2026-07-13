// Relay hosts the extension is permitted to connect to.
const N8N_CLOUD_SUFFIXES = ['.app.n8n.cloud', '.stage-app.n8n.cloud'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function getRelayHost(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

export function isLocalhostRelay(url: string | null | undefined): boolean {
	const host = getRelayHost(url);
	return host !== null && LOCAL_HOSTS.has(host);
}

export function isAllowedRelayUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return false;
	const host = parsed.hostname;
	if (LOCAL_HOSTS.has(host)) return true;
	return N8N_CLOUD_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}
