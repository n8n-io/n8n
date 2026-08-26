import globalAxios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';

const DEFAULT_TIMEOUT_MS = 300_000;

const agentCache = new Map();

const agentFor = (protocol, proxyUrl) => {
	const key = `${protocol}${proxyUrl}`;
	if (!agentCache.has(key)) {
		agentCache.set(
			key,
			protocol === 'https:' ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl),
		);
	}
	return agentCache.get(key);
};

/**
 * Applies n8n's shared axios defaults to the client: the 300s request timeout
 * and routing per HTTP(S)_PROXY / NO_PROXY / ALL_PROXY. Axios's own env-proxy
 * handling is disabled because it mishandles https targets behind an http
 * proxy (axios#4531).
 */
export const configureAxiosEnvProxy = (client = globalAxios) => {
	client.defaults.timeout = DEFAULT_TIMEOUT_MS;
	client.defaults.proxy = false;
	client.interceptors.request.use((config) => {
		const url = new URL(config.url, config.baseURL);
		const proxyUrl = getProxyForUrl(url.href);
		if (proxyUrl) {
			if (url.protocol === 'https:') {
				config.httpsAgent = agentFor(url.protocol, proxyUrl);
			} else {
				config.httpAgent = agentFor(url.protocol, proxyUrl);
			}
		}
		return config;
	});
};
