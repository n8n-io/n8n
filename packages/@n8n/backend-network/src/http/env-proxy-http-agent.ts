import { HttpProxyAgent } from 'http-proxy-agent';
import http from 'node:http';
import type { LookupFunction } from 'node:net';

import { EnvProxyRouter } from './env-proxy-router';
import type { NodeAgentOptions } from './node-agents';

type HttpAddRequestArgs = Parameters<HttpProxyAgent<string>['addRequest']>;
type HttpProxyClientReq = HttpAddRequestArgs[0];
type HttpProxyReqOpts = HttpAddRequestArgs[1];

/**
 * `http.Agent` that delegates per-request env-proxy routing and caching to a shared {@link EnvProxyRouter}.
 *
 * The optional SSRF `lookup` is applied to the direct path only
 * (behind a proxy it would resolve the proxy host, so the proxy validates the target).
 *
 * Also backs `installGlobalProxyAgent` (http-proxy.ts), keeping a single env-proxy agent implementation.
 */
export class EnvProxyHttpAgent extends http.Agent {
	private readonly router: EnvProxyRouter<HttpProxyAgent<string>>;

	constructor(lookup?: LookupFunction, agentOptions?: NodeAgentOptions) {
		super({ ...agentOptions, lookup });
		this.router = new EnvProxyRouter(
			'http',
			80,
			(proxyUrl) => new HttpProxyAgent(proxyUrl, { ...agentOptions }),
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
