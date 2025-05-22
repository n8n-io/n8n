import { HttpsProxyAgent } from 'https-proxy-agent';

export function getHttpProxyAgent() {
	const httpProxy =
		process.env.HTTPS_PROXY ??
		process.env.https_proxy ??
		process.env.HTTP_PROXY ??
		process.env.http_proxy;

	return httpProxy ? new HttpsProxyAgent(httpProxy) : undefined;
}
