import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { UnexpectedError } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import { EnvProxyHttpAgent } from './env-proxy-http-agent';
import { EnvProxyHttpsAgent } from './env-proxy-https-agent';
import type { SsrfBridge } from '../ssrf';

/**
 * An explicit proxy URL for routing all requests from this client.
 * Only HTTP(S) forward proxies are supported: both the Node.js agents
 * and the undici dispatcher (`ProxyAgent`) speak the HTTP CONNECT protocol, not SOCKS.
 */
export type ProxyUrl = `${'http' | 'https'}://${string}`;

/**
 * Type guard for {@link ProxyUrl}.
 * Only HTTP(S) forward proxies are supported.
 */
export function isSupportedProxyUrl(value: string): value is ProxyUrl {
	return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Controls how outgoing requests are routed through a proxy.
 * - `'env'` (default): read HTTP_PROXY / HTTPS_PROXY / NO_PROXY from the environment
 * - `ProxyUrl`: route all requests through the given proxy
 * - `false`: bypass all proxies, connect directly to the target
 */
export type ProxyOption = 'env' | ProxyUrl | false;

/**
 * Controls SSRF protection for an outbound HTTP client.
 * Explicitly passing `'disabled'` makes the opt-out visible in calling code.
 */
export type SsrfOption = SsrfBridge | 'disabled';

/**
 * Per-call Node.js agent options (TLS, keep-alive, `servername`, ...)
 * forwarded to the underlying http/https agents.
 */
export type NodeAgentOptions = https.AgentOptions;

/**
 * Builds the `{ httpAgent, httpsAgent }` pair for a given proxy + SSRF policy.
 *
 * Single source of truth for outbound Node.js agent construction, shared by the
 * undici factory (`undici/factory.ts`), the axios transport layer
 * (`axios/utils.ts`) and the global proxy agents (`http-proxy.ts`).
 *
 * SSRF lookup is injected only for **direct** connections. Behind a proxy the
 * lookup resolves the proxy host, not the final target, so it is omitted there
 * and the proxy validates the final target.
 *
 * The `lookup` is owned by this builder: it is derived from the SSRF policy and
 * always overrides anything in `agentOptions`. Passing `agentOptions.lookup`
 * therefore has no effect and is rejected to avoid a false sense of control over
 * DNS resolution.
 */
export function buildNodeAgents(
	proxy: ProxyOption,
	ssrf: SsrfOption,
	agentOptions?: NodeAgentOptions,
): { httpAgent: http.Agent; httpsAgent: https.Agent } {
	if (agentOptions?.lookup) {
		throw new UnexpectedError(
			'`agentOptions.lookup` is not supported: DNS resolution is managed by the SSRF policy. Remove it from `agentOptions`.',
		);
	}

	const lookup: LookupFunction | undefined =
		ssrf !== 'disabled' ? ssrf.createSecureLookup() : undefined;

	if (proxy === false) {
		return applyConnectionGuard(
			{
				httpAgent: new http.Agent({ ...agentOptions, lookup }),
				httpsAgent: new https.Agent({ ...agentOptions, lookup }),
			},
			ssrf,
		);
	}

	if (proxy === 'env') {
		return applyConnectionGuard(
			{
				httpAgent: new EnvProxyHttpAgent(lookup, agentOptions),
				httpsAgent: new EnvProxyHttpsAgent(lookup, agentOptions),
			},
			ssrf,
		);
	}

	// Explicit proxy URL. No direct path, so no SSRF lookup is injected.
	return {
		httpAgent: new HttpProxyAgent(proxy as string, { ...agentOptions }),
		httpsAgent: new HttpsProxyAgent(proxy as string, { ...agentOptions }),
	};
}

/** Subset of an agent's connection options we read to find the target host. */
type ConnectionOptions = { host?: string | null; hostname?: string | null };

/**
 * Runtime-only `createConnection` method of Node's http(s) agents.
 */
type CreateConnection = (
	options: ConnectionOptions,
	onConnect?: (error: Error | null, stream?: unknown) => void,
) => unknown;

/**
 * Installs {@link installConnectionGuard} on a direct-path agent pair when SSRF protection is active.
 */
function applyConnectionGuard(
	agents: { httpAgent: http.Agent; httpsAgent: https.Agent },
	ssrf: SsrfOption,
): { httpAgent: http.Agent; httpsAgent: https.Agent } {
	if (ssrf !== 'disabled') {
		installConnectionGuard(agents.httpAgent, ssrf);
		installConnectionGuard(agents.httpsAgent, ssrf);
	}
	return agents;
}

/**
 * Wraps an agent's `createConnection` to validate the connection target before the socket opens.
 * Node invokes the custom `lookup` only to resolve hostnames, so it also requires a check at connection time.
 */
export function installConnectionGuard(
	target: { createConnection: CreateConnection },
	ssrf: SsrfBridge,
): void {
	const createConnection = target.createConnection.bind(target);
	target.createConnection = (options, onConnect) => {
		const host = options.host ?? options.hostname ?? undefined;
		if (typeof host === 'string') {
			const result = ssrf.validateConnectionHost(host);
			if (!result.ok) {
				if (onConnect) {
					onConnect(result.error);
					return undefined;
				}
				throw result.error;
			}
		}
		return createConnection(options, onConnect);
	};
}
