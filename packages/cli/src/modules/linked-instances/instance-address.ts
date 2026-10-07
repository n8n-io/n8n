export type InstanceAddressError =
	| 'empty'
	| 'invalid'
	| 'unsupported-protocol'
	| 'insecure-http'
	| 'has-credentials';

export type InstanceAddressResult =
	| { ok: true; origin: string; mcpUrl: string; host: string; isLoopback: boolean }
	| { ok: false; error: InstanceAddressError };

export interface InstanceAddressOptions {
	/** Accept plain HTTP for hosts that are not loopback. */
	allowInsecureHttp?: boolean;
}

/** Path of the MCP endpoint that every n8n instance serves. */
export const INSTANCE_MCP_PATH = '/mcp-server/http';

const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i;
// The URL parser reads "localhost:5678" as scheme "localhost". Users mean host and port.
const HOST_AND_PORT = /^[^/?#@:]+:\d+(?:[/?#]|$)/;
// The URL parser reads "user:pw@host" as scheme "user". Users mean credentials and a host.
const USER_INFO_WITHOUT_SCHEME = /^[^/?#]+@/;
// The URL parser silently removes tabs and newlines. Reject them so a typo does not pass.
const WHITESPACE = /\s/;
// The URL parser writes every IPv4 form ("127.1", "0x7f.0.0.1") as four decimal parts.
const IPV4_LOOPBACK = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

/** True for "localhost", 127.0.0.0/8 and "[::1]", as `URL.hostname` writes them. */
export function isLoopbackHostname(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '[::1]' || IPV4_LOOPBACK.test(hostname);
}

function withScheme(address: string): string {
	const hasScheme =
		SCHEME_PREFIX.test(address) &&
		!HOST_AND_PORT.test(address) &&
		!USER_INFO_WITHOUT_SCHEME.test(address);
	return hasScheme ? address : `https://${address}`;
}

function parseUrl(address: string): URL | undefined {
	try {
		return new URL(address);
	} catch {
		return undefined;
	}
}

function findUrlError(url: URL, options: InstanceAddressOptions): InstanceAddressError | undefined {
	if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return 'unsupported-protocol';
	if (url.username !== '' || url.password !== '') return 'has-credentials';

	const insecure = url.protocol === 'http:' && !isLoopbackHostname(url.hostname);
	if (insecure && options.allowInsecureHttp !== true) return 'insecure-http';

	return undefined;
}

/**
 * Turn the address that a user pastes for another n8n instance into one canonical origin.
 * The function never throws, so callers can show the error reason directly.
 */
export function normaliseInstanceAddress(
	input: string,
	options: InstanceAddressOptions = {},
): InstanceAddressResult {
	const address = input.trim();
	if (address === '') return { ok: false, error: 'empty' };
	if (WHITESPACE.test(address)) return { ok: false, error: 'invalid' };

	const url = parseUrl(withScheme(address));
	if (!url) return { ok: false, error: 'invalid' };

	const error = findUrlError(url, options);
	if (error) return { ok: false, error };

	// For http and https, `URL.origin` has a lower-case host and no default port, path, query or hash.
	const { origin, hostname } = url;
	return {
		ok: true,
		origin,
		mcpUrl: `${origin}${INSTANCE_MCP_PATH}`,
		host: hostname,
		isLoopback: isLoopbackHostname(hostname),
	};
}
