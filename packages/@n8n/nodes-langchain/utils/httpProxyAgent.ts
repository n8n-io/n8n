import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';

export function getHttpProxyAgent(baseURL: string) {
	const protocol = baseURL && baseURL.startsWith('http://') ? 'http' : 'https';
	// Forcing proxy to resolve if no baseURL is passed
	const proxyUrl = proxyFromEnv.getProxyForUrl(baseURL);

	if (proxyUrl) {
		const ProxyAgent = protocol === 'http' ? HttpProxyAgent : HttpsProxyAgent;
		return new ProxyAgent(proxyUrl);
	}
	return undefined;
}
