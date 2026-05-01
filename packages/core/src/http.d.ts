import type http from 'http-proxy-agent';
import type https from 'https-proxy-agent';

declare module 'http' {
	interface Agent {
		addRequest(req: ClientRequest, options: http.HttpProxyAgentOptions): void;
	}
}

declare module 'https' {
	interface Agent {
		addRequest(req: ClientRequest, options: https.HttpsProxyAgentOptions): void;
	}
}
