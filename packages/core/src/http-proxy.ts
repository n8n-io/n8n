import http from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { LoggerProxy } from 'n8n-workflow';
import proxyFromEnv from 'proxy-from-env';

let isGlobalProxyInstalled = false;

const buildTargetUrl = (hostname: string, port: number, protocol: 'http' | 'https'): string => {
	const defaultPort = protocol === 'https' ? 443 : 80;
	const portSuffix = port === defaultPort ? '' : `:${port}`;
	return `${protocol}://${hostname}${portSuffix}`;
};

class DynamicProxyAgent<TAgent extends http.Agent | https.Agent> {
	private proxyAgents = new Map<string, HttpProxyAgent<string> | HttpsProxyAgent<string>>();

	constructor(
		private baseAgent: new () => TAgent,
		private protocol: 'http' | 'https',
		private ProxyAgentClass: typeof HttpProxyAgent | typeof HttpsProxyAgent,
	) {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addRequest(req: http.ClientRequest, options: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const hostname: string = options.host || options.hostname;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const port: number = options.port || (this.protocol === 'https' ? 443 : 80);
		const targetUrl = buildTargetUrl(String(hostname), Number(port), this.protocol);
		const proxyUrl = proxyFromEnv.getProxyForUrl(targetUrl);

		if (proxyUrl) {
			let proxyAgent = this.proxyAgents.get(proxyUrl);
			if (!proxyAgent) {
				proxyAgent = new this.ProxyAgentClass(proxyUrl);
				this.proxyAgents.set(proxyUrl, proxyAgent);
			}
			// @ts-expect-error addRequest exists on proxy agents
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			return proxyAgent.addRequest(req, options);
		}

		// @ts-expect-error addRequest exists on base agent
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return new this.baseAgent().addRequest(req, options);
	}
}

class DynamicProxyHttpAgent extends http.Agent {
	private dynamicAgent = new DynamicProxyAgent(http.Agent, 'http', HttpProxyAgent);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addRequest(req: http.ClientRequest, options: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this.dynamicAgent.addRequest(req, options);
	}
}

class DynamicProxyHttpsAgent extends https.Agent {
	private dynamicAgent = new DynamicProxyAgent(https.Agent, 'https', HttpsProxyAgent);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addRequest(req: http.ClientRequest, options: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this.dynamicAgent.addRequest(req, options);
	}
}

export function ProxyFromEnvHttpAgent(
	customProxyUrl: string | null = null,
	options?: http.AgentOptions,
	targetUrl?: string,
): http.Agent {
	if (customProxyUrl) {
		return new HttpProxyAgent(customProxyUrl, options);
	}

	const testUrl = targetUrl || 'http://example.com';
	const proxyUrl = proxyFromEnv.getProxyForUrl(testUrl);

	if (proxyUrl) {
		return new HttpProxyAgent(proxyUrl, options);
	}

	return new http.Agent(options);
}

export function ProxyFromEnvHttpsAgent(
	customProxyUrl: string | null = null,
	options?: https.AgentOptions,
	targetUrl?: string,
): https.Agent {
	if (customProxyUrl) {
		return new HttpsProxyAgent(customProxyUrl, options);
	}

	const testUrl = targetUrl || 'https://example.com';
	const proxyUrl = proxyFromEnv.getProxyForUrl(testUrl);

	if (proxyUrl) {
		return new HttpsProxyAgent(proxyUrl, options);
	}

	return new https.Agent(options);
}

const hasProxyEnvVars = (): boolean =>
	!!(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY);

export function installGlobalProxyAgent(): void {
	if (hasProxyEnvVars() && !isGlobalProxyInstalled) {
		LoggerProxy.debug('Installing dynamic proxy agents from environment variables', {
			HTTP_PROXY: process.env.HTTP_PROXY,
			HTTPS_PROXY: process.env.HTTPS_PROXY,
			NO_PROXY: process.env.NO_PROXY,
			ALL_PROXY: process.env.ALL_PROXY,
		});

		http.globalAgent = new DynamicProxyHttpAgent();
		https.globalAgent = new DynamicProxyHttpsAgent();

		isGlobalProxyInstalled = true;
		LoggerProxy.debug('Global dynamic proxy agents installed');
	}
}

export function uninstallGlobalProxyAgent(): void {
	if (!isGlobalProxyInstalled) {
		return;
	}

	http.globalAgent = new http.Agent();
	https.globalAgent = new https.Agent();

	isGlobalProxyInstalled = false;
	LoggerProxy.debug('Global proxy agents uninstalled');
}
