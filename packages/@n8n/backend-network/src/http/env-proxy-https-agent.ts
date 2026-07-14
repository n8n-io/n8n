import { HttpsProxyAgent } from 'https-proxy-agent';
import type http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import { EnvProxyRouter } from './env-proxy-router';
import type { NodeAgentOptions } from './node-agents';

type HttpsProxyReqOpts = Parameters<HttpsProxyAgent<string>['addRequest']>[1];

/**
 * `https.Agent` counterpart of {@link EnvProxyHttpAgent}
 */
export class EnvProxyHttpsAgent extends https.Agent {
	private readonly router: EnvProxyRouter<HttpsProxyAgent<string>>;

	constructor(lookup?: LookupFunction, agentOptions?: NodeAgentOptions) {
		super({ ...agentOptions, lookup });
		this.router = new EnvProxyRouter(
			'https',
			443,
			(proxyUrl) => new HttpsProxyAgent(proxyUrl, { ...agentOptions }),
		);
	}

	addRequest(req: http.ClientRequest, options: https.RequestOptions): void {
		const proxyAgent = this.router.resolve(options);

		if (proxyAgent) {
			return proxyAgent.addRequest(req, options as HttpsProxyReqOpts);
		}

		// No proxy for this target: serve it directly from this agent's own pool.
		super.addRequest(req, options);
	}
}
