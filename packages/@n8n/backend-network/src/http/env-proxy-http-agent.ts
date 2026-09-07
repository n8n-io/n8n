import type { HttpProxyAgent } from 'http-proxy-agent';
import http from 'node:http';
import type { LookupFunction } from 'node:net';

import { EnvProxyRouter } from './env-proxy-router';
import type { NodeAgentOptions } from './node-agents';
import { createProxiedHttpAgent } from '../proxy/proxied-agents';

type HttpAddRequestArgs = Parameters<HttpProxyAgent<string>['addRequest']>;
type HttpProxyClientReq = HttpAddRequestArgs[0];
type HttpProxyReqOpts = HttpAddRequestArgs[1];

/**
 * `http.Agent` that delegates per-request env-proxy routing and caching to a shared {@link EnvProxyRouter}.
 *
 * The optional SSRF `lookup` is applied to the direct path only.
 * A proxy named by the environment belongs to the deployment rather than to a request.
 * The policy that decides which targets a workflow may reach does not decide such a
 * proxy (see `buildNodeAgents`).
 *
 * Also backs `installGlobalProxyAgent` (http-proxy.ts), keeping a single env-proxy agent implementation.
 */
export class EnvProxyHttpAgent extends http.Agent {
	private readonly router: EnvProxyRouter<HttpProxyAgent<string>>;

	constructor(lookup?: LookupFunction, agentOptions?: NodeAgentOptions) {
		super({ ...agentOptions, ...(lookup && { lookup }) });
		this.router = new EnvProxyRouter('http', 80, (proxyUrl) =>
			createProxiedHttpAgent(proxyUrl, agentOptions),
		);
	}

	addRequest(req: http.ClientRequest, options: http.RequestOptions): void {
		const proxyAgent = this.router.resolve(options);

		if (proxyAgent) {
			return proxyAgent.addRequest(req as HttpProxyClientReq, options as HttpProxyReqOpts);
		}

		// No proxy for this target: serve it directly from this agent's own pool.
		super.addRequest(req, options);
	}
}
