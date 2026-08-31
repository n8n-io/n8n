import { UnexpectedError } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import { installConnectionGuard, installProxyConnectionGuard } from './connection-guards';
import { EnvProxyHttpAgent } from './env-proxy-http-agent';
import { EnvProxyHttpsAgent } from './env-proxy-https-agent';
import { createProxiedHttpAgent, createProxiedHttpsAgent } from '../proxy/proxied-agents';
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
export function isSupportedProxyUrl(value: string | null | undefined): value is ProxyUrl {
	return (
		value !== null &&
		value !== undefined &&
		(value.startsWith('http://') || value.startsWith('https://'))
	);
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
 * The SSRF policy covers every host this builder opens a socket to, with one
 * exception: a proxy named by the environment.
 * `HTTP_PROXY` / `HTTPS_PROXY` describe the deployment rather than a request, and
 * such a proxy commonly sits on a private address the policy blocks for targets.
 * Setting them already requires control of the process.
 * An explicit {@link ProxyUrl} can come from a request, so the policy decides its
 * host like any other.
 *
 * The lookup resolves the target on a direct connection, and the proxy's own host
 * behind an explicit proxy.
 * Behind any proxy the final target never reaches these agents, so validating it
 * belongs to the caller:
 * - the axios entry points (`httpRequest`, `executeLegacyRequest`) check it before
 *   the request, and on each hop with the manual redirect follower
 * - callers taking the agents on their own (`HttpTransport.getNodeAgent`) get
 *   neither check, and validate the targets they send through them
 *
 * A pre-request check does not pin an address to the socket, so a target the proxy
 * resolves stays open to a rebind between the check and the connection.
 *
 * The `lookup` is owned by this builder: it is derived from the SSRF policy and
 * always overrides anything in `agentOptions`. Passing `agentOptions.lookup`
 * therefore has no effect and is rejected to avoid a false sense of control over
 * DNS resolution.
 *
 * `agentOptions` describes the connection to the **target**. Behind a proxy its TLS
 * options travel with the tunnelled session rather than the proxy handshake
 * (see `proxy/proxied-agents.ts`).
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

	// Explicit proxy URL. No direct path, so the lookup only guards the proxy host.
	const agents = {
		httpAgent: createProxiedHttpAgent(proxy, { ...agentOptions, lookup }),
		httpsAgent: createProxiedHttpsAgent(proxy, { ...agentOptions, lookup }),
	};
	if (ssrf !== 'disabled') {
		installProxyConnectionGuard(agents.httpAgent, ssrf);
		installProxyConnectionGuard(agents.httpsAgent, ssrf);
	}
	return agents;
}

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
