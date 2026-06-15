import type http from 'node:http';
import { getProxyForUrl } from 'proxy-from-env';

/**
 * Per-request env-proxy routing.
 *
 * Owns the single per-proxy-URL agent cache and resolves each request target
 * against the environment (HTTP_PROXY / HTTPS_PROXY / NO_PROXY) for its scheme.
 *
 * @typeParam TProxyAgent - the proxy-agent type for this scheme (`HttpProxyAgent` or `HttpsProxyAgent`).
 */
export class EnvProxyRouter<TProxyAgent> {
	private readonly proxyCache = new Map<string, TProxyAgent>();

	constructor(
		private readonly scheme: 'http' | 'https',
		private readonly defaultPort: number,
		private readonly createProxyAgent: (proxyUrl: string) => TProxyAgent,
	) {}

	/**
	 * Resolves the request target to the proxy agent it should be dispatched through.
	 */
	resolve(options: http.RequestOptions): TProxyAgent | undefined {
		const hostname = String(options.hostname ?? options.host ?? 'localhost');
		const rawPort = options.port;
		const port =
			typeof rawPort === 'string' ? parseInt(rawPort, 10) : (rawPort ?? this.defaultPort);
		const portSuffix = port === this.defaultPort ? '' : `:${port}`;
		const proxyUrl = getProxyForUrl(`${this.scheme}://${hostname}${portSuffix}`);

		if (!proxyUrl) {
			return undefined;
		}

		let agent = this.proxyCache.get(proxyUrl);
		if (!agent) {
			agent = this.createProxyAgent(proxyUrl);
			this.proxyCache.set(proxyUrl, agent);
		}
		return agent;
	}
}
