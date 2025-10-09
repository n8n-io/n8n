import type { AgentConnectOpts } from 'agent-base';
import http from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type net from 'net';
import proxyFromEnv from 'proxy-from-env';

interface RequestOptions {
	secureEndpoint: true;
	protocol: string;
	hostname: string;
	host: string;
	port: number;
}

function buildTargetUrl(options: RequestOptions, defaultProtocol: 'http:' | 'https:'): string {
	const protocol = options.protocol ?? defaultProtocol;
	const hostname = options.hostname ?? options.host ?? 'localhost';

	const url = new URL(`${protocol}//${hostname}`);
	if (options.port) {
		url.port = String(options.port);
	}

	return url.href;
}

/**
 * An HTTP agent that uses a proxy if one is configured for the target URL
 * according to environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, ALL_PROXY).
 *
 * NOTE: As of 09/2025 Node.js is activily developing native proxy support for http(s): https://nodejs.org/api/http.html#built-in-proxy-support
 * We could switch to that once it is stable and available.
 */
export class ProxyFromEnvHttpAgent extends http.Agent {
	constructor(
		private readonly customProxyUrl: string | null = null,
		options?: http.AgentOptions,
	) {
		super(options);
	}

	addRequest(req: http.ClientRequest, options: RequestOptions): void {
		const targetUrl = buildTargetUrl(options, 'http:');
		const proxyUrl = this.customProxyUrl ?? proxyFromEnv.getProxyForUrl(targetUrl);

		if (proxyUrl) {
			const proxyAgent = new HttpProxyAgent<string>(proxyUrl);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			proxyAgent.addRequest(req as any, options);
		} else {
			// Use the default agent behavior
			// @ts-expect-error addRequest exists, but is not in @types/node
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			super.addRequest(req, options);
		}
	}

	async connect(req: http.ClientRequest, opts: RequestOptions): Promise<net.Socket> {
		const targetUrl = buildTargetUrl(opts, 'http:');
		const proxyUrl = this.customProxyUrl ?? proxyFromEnv.getProxyForUrl(targetUrl);

		if (proxyUrl) {
			const proxyAgent = new HttpProxyAgent<string>(proxyUrl);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return await proxyAgent.connect(req as any, opts);
		} else {
			// @ts-expect-error connect exists, but is not in @types/node
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			return await super.connect(req, opts);
		}
	}
}

/**
 * An HTTPS agent that uses a proxy if one is configured for the target URL
 * according to environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, ALL_PROXY).
 */
export class ProxyFromEnvHttpsAgent extends https.Agent {
	constructor(
		private readonly customProxyUrl: string | null = null,
		options?: https.AgentOptions,
	) {
		super(options);
	}

	addRequest(req: http.ClientRequest, options: RequestOptions): void {
		const targetUrl = buildTargetUrl(options, 'https:');
		const proxyUrl = this.customProxyUrl ?? proxyFromEnv.getProxyForUrl(targetUrl);

		if (proxyUrl) {
			// HttpsProxyAgent extends agent-base and doesn't have addRequest
			// Use default agent behavior and let connect handle the proxy
			// @ts-expect-error addRequest exists, but is not in @types/node
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			super.addRequest(req, options);
		} else {
			// Use the default agent behavior
			// @ts-expect-error addRequest exists, but is not in @types/node
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			super.addRequest(req, options);
		}
	}

	async connect(req: http.ClientRequest, opts: RequestOptions): Promise<net.Socket> {
		const targetUrl = buildTargetUrl(opts, 'https:');
		const proxyUrl = this.customProxyUrl ?? proxyFromEnv.getProxyForUrl(targetUrl);

		if (proxyUrl) {
			const proxyAgent = new HttpsProxyAgent<string>(proxyUrl);
			return await proxyAgent.connect(req, opts);
		} else {
			// @ts-expect-error connect exists, but is not in @types/node
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			return await super.connect(req, opts);
		}
	}
}

export function installGlobalProxyAgent(): void {
	http.globalAgent = new ProxyFromEnvHttpAgent();
	https.globalAgent = new ProxyFromEnvHttpsAgent();
}
