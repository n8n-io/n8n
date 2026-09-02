import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type http from 'node:http';
import { getProxyForUrl } from 'proxy-from-env';

const MAX_CACHED_AGENTS = 64;

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

	// Defensive upper bound on cached agents. Normally unreachable: the cache is keyed by the *proxy* URL.
	private cacheLimitWarned = false;

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
		const port = this.resolvePort(options.port);
		const portSuffix = port === this.defaultPort ? '' : `:${port}`;
		const proxyUrl = getProxyForUrl(`${this.scheme}://${hostname}${portSuffix}`);

		if (!proxyUrl) {
			return undefined;
		}

		const cached = this.proxyCache.get(proxyUrl);
		if (cached) {
			return cached;
		}

		const agent = this.createProxyAgent(proxyUrl);
		this.cacheAgent(proxyUrl, agent);
		return agent;
	}

	private cacheAgent(proxyUrl: string, agent: TProxyAgent): void {
		if (this.proxyCache.size >= MAX_CACHED_AGENTS) {
			if (!this.cacheLimitWarned) {
				this.cacheLimitWarned = true;
				Container.get(Logger).warn(
					`${this.scheme} proxy agent cache reached its limit of ${MAX_CACHED_AGENTS} entries; not caching further proxy agents. This is unexpected and likely indicates a misconfiguration.`,
				);
			}
		} else {
			this.proxyCache.set(proxyUrl, agent);
		}
	}

	private resolvePort(rawPort: http.RequestOptions['port']): number {
		const parsed = typeof rawPort === 'string' ? parseInt(rawPort, 10) : rawPort;
		if (Number.isInteger(parsed)) {
			return parsed as number;
		}
		if (rawPort !== undefined && rawPort !== null) {
			Container.get(Logger).warn(
				`Unparseable port "${String(rawPort)}" for ${this.scheme} proxy routing, falling back to default port ${this.defaultPort}`,
			);
		}
		return this.defaultPort;
	}
}
