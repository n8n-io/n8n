import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';

export function getHttpProxyAgent(baseURL?: string) {
	if (!baseURL) return undefined;

	const protocol = baseURL.startsWith('https://') ? 'https' : 'http';
	const proxyUrl = proxyFromEnv.getProxyForUrl(baseURL);

	if (proxyUrl) {
		const ProxyAgent = protocol === 'http' ? HttpProxyAgent : HttpsProxyAgent;
		return new ProxyAgent(proxyUrl);
	}
	return undefined;
}
