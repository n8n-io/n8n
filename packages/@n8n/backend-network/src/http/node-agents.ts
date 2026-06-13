import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { getProxyForUrl } from 'proxy-from-env';

import type { SsrfBridge } from '../ssrf';

/**
 * An explicit proxy URL for routing all requests from this client.
 * Only HTTP(S) forward proxies are supported: both the Node.js agents
 * and the undici dispatcher (`ProxyAgent`) speak the HTTP CONNECT protocol, not SOCKS.
 */
export type ProxyUrl = `${'http' | 'https'}://${string}`;

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
 */
export function buildNodeAgents(
	proxy: ProxyOption,
	ssrf: SsrfOption,
	agentOptions?: NodeAgentOptions,
): { httpAgent: http.Agent; httpsAgent: https.Agent } {
	const lookup: LookupFunction | undefined =
		ssrf !== 'disabled' ? ssrf.createSecureLookup() : undefined;

	if (proxy === false) {
		return {
			httpAgent: new http.Agent({ ...agentOptions, lookup }),
			httpsAgent: new https.Agent({ ...agentOptions, lookup }),
		};
	}

	if (proxy === 'env') {
		return {
			httpAgent: new EnvProxyHttpAgent(lookup, agentOptions),
			httpsAgent: new EnvProxyHttpsAgent(lookup, agentOptions),
		};
	}

	// Explicit proxy URL. No direct path, so no SSRF lookup is injected.
	// `proxy` is narrowed to ProxyUrl here, but the proxy-agent constructors are
	// generic over the URL's string-literal type; widening to `string` keeps the
	// agentOptions overload from collapsing to `undefined`.
	return {
		httpAgent: new HttpProxyAgent(proxy as string, { ...agentOptions }),
		httpsAgent: new HttpsProxyAgent(proxy as string, { ...agentOptions }),
	};
}

// ---------------------------------------------------------------------------
// Env-proxy Node.js agents
//
// Per-request env-proxy routing (HTTP_PROXY / HTTPS_PROXY / NO_PROXY): each
// request is resolved against the environment and dispatched either through a
// cached proxy agent or directly from this agent's own pool. An optional SSRF
// `lookup` is applied to the direct path only; behind a proxy the lookup would
// resolve the proxy host, not the final target, so the proxy validates it.
//
// These also back `installGlobalProxyAgent` in http-proxy.ts (constructed with
// no lookup), so there is a single env-proxy agent implementation.
// ---------------------------------------------------------------------------

type HttpAddRequestArgs = Parameters<HttpProxyAgent<string>['addRequest']>;
type HttpProxyClientReq = HttpAddRequestArgs[0];
type HttpProxyReqOpts = HttpAddRequestArgs[1];

export class EnvProxyHttpAgent extends http.Agent {
	private readonly proxyCache = new Map<string, HttpProxyAgent<string>>();

	constructor(
		lookup?: LookupFunction,
		private readonly agentOptions?: NodeAgentOptions,
	) {
		super({ ...agentOptions, lookup });
	}

	addRequest(req: http.ClientRequest, options: http.RequestOptions): void {
		const hostname = String(options.hostname ?? options.host ?? 'localhost');
		const rawPort = options.port;
		const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : (rawPort ?? 80);
		const portSuffix = port === 80 ? '' : `:${port}`;
		const proxyUrl = getProxyForUrl(`http://${hostname}${portSuffix}`);

		if (proxyUrl) {
			let agent = this.proxyCache.get(proxyUrl);
			if (!agent) {
				agent = new HttpProxyAgent(proxyUrl, { ...this.agentOptions });
				this.proxyCache.set(proxyUrl, agent);
			}
			return agent.addRequest(req as HttpProxyClientReq, options as HttpProxyReqOpts);
		}

		// No proxy for this target: serve it directly from this agent's own pool.
		super.addRequest(req, options);
	}
}

type HttpsProxyReqOpts = Parameters<HttpsProxyAgent<string>['addRequest']>[1];

export class EnvProxyHttpsAgent extends https.Agent {
	private readonly proxyCache = new Map<string, HttpsProxyAgent<string>>();

	constructor(
		lookup?: LookupFunction,
		private readonly agentOptions?: NodeAgentOptions,
	) {
		super({ ...agentOptions, lookup });
	}

	addRequest(req: http.ClientRequest, options: https.RequestOptions): void {
		const hostname = String(options.hostname ?? options.host ?? 'localhost');
		const rawPort = options.port;
		const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : (rawPort ?? 443);
		const portSuffix = port === 443 ? '' : `:${port}`;
		const proxyUrl = getProxyForUrl(`https://${hostname}${portSuffix}`);

		if (proxyUrl) {
			let agent = this.proxyCache.get(proxyUrl);
			if (!agent) {
				agent = new HttpsProxyAgent(proxyUrl, { ...this.agentOptions });
				this.proxyCache.set(proxyUrl, agent);
			}
			return agent.addRequest(req, options as HttpsProxyReqOpts);
		}

		// No proxy for this target: serve it directly from this agent's own pool.
		super.addRequest(req, options);
	}
}
