import http from 'http';
import https from 'https';
import { LoggerProxy } from 'n8n-workflow';

import { EnvProxyHttpAgent } from './env-proxy-http-agent';
import { EnvProxyHttpsAgent } from './env-proxy-https-agent';
import { hasProxyEnvironmentVariables } from '../proxy/proxy-resolution';

export function installGlobalProxyAgent(): void {
	if (hasProxyEnvironmentVariables()) {
		LoggerProxy.debug('Installing global HTTP proxy agents', {
			HTTP_PROXY: process.env.HTTP_PROXY ?? process.env.http_proxy,
			HTTPS_PROXY: process.env.HTTPS_PROXY ?? process.env.https_proxy,
			NO_PROXY: process.env.NO_PROXY ?? process.env.no_proxy,
			ALL_PROXY: process.env.ALL_PROXY ?? process.env.all_proxy,
		});

		// Reuse the factory's env-proxy agents (no SSRF lookup at the global level;
		// per-request SSRF enforcement is applied by the outbound HTTP client).
		http.globalAgent = new EnvProxyHttpAgent();
		https.globalAgent = new EnvProxyHttpsAgent();
	}
}

export function uninstallGlobalProxyAgent(): void {
	http.globalAgent = new http.Agent();
	https.globalAgent = new https.Agent();
}
