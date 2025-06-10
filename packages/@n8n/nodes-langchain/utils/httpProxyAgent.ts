import { HttpsProxyAgent } from 'https-proxy-agent';

export function getHttpProxyAgent(baseURL?: string) {
	const noProxy = process.env.NO_PROXY ?? process.env.no_proxy;

	if (baseURL && noProxy && shouldBypassProxy(baseURL, noProxy)) return undefined;

	const httpProxy =
		process.env.HTTPS_PROXY ??
		process.env.https_proxy ??
		process.env.HTTP_PROXY ??
		process.env.http_proxy;

	return httpProxy ? new HttpsProxyAgent(httpProxy) : undefined;
}

function shouldBypassProxy(baseURL: string, noProxyString: string): boolean {
	// Parse comma-separated NO_PROXY string into array, trim whitespace
	const noProxyPatterns = noProxyString
		.split(',')
		.map((pattern) => pattern.trim())
		.filter((pattern) => pattern.length > 0);

	let hostname: string;

	try {
		// Parse the URL, default to http if no protocol
		const url = new URL(baseURL.startsWith('http') ? baseURL : `http://${baseURL}`);
		hostname = url.hostname;
	} catch (error) {
		// If URL parsing fails, assume urlString is just a hostname
		hostname = baseURL;
	}

	// Regular expression for IP address validation
	const ipRegex =
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

	for (const pattern of noProxyPatterns) {
		// Direct hostname match
		if (pattern === hostname) {
			return true;
		}

		// Wildcard domain match (e.g., *.example.com)
		if (pattern.startsWith('*.')) {
			const domain = pattern.slice(2);
			if (hostname === domain || hostname.endsWith(`.${domain}`)) {
				return true;
			}
		}

		// IP address match (validate pattern is an IP)
		if (ipRegex.test(pattern) && pattern === hostname) {
			return true;
		}
	}

	return false;
}
