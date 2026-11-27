import type { CustomFetch } from '@n8n/backend-network';

export interface CapturedRequest {
	method: string;
	url: URL;
	headers: Record<string, string>;
	body?: Buffer;
}

// Headers that the HTTP client of the copy sets itself.
const SET_BY_CLIENT: ReadonlySet<string> = new Set([
	'host',
	'content-length',
	'connection',
	'keep-alive',
	'transfer-encoding',
	'accept-encoding',
]);

export interface NetworkSendOptions {
	// The instance transport, so that the proxy and egress settings apply. Defaults to the global `fetch`.
	fetch?: CustomFetch;
	// A real service that does not answer in this time fails the request.
	timeoutMs?: number;
}

/** Sends a captured request to the real network. Use it for the real read of a decision. */
export async function sendToNetwork(
	req: CapturedRequest,
	options: NetworkSendOptions = {},
): Promise<Response> {
	const headers = Object.fromEntries(
		Object.entries(req.headers).filter(([name]) => !SET_BY_CLIENT.has(name.toLowerCase())),
	);
	const send = options.fetch ?? fetch;
	return await send(req.url, {
		signal: options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs),
		method: req.method,
		headers,
		// A redirect can leave the vendor host with the credential. Return it to the caller as it is.
		redirect: 'manual',
		body:
			req.body && req.method !== 'GET' && req.method !== 'HEAD'
				? new Uint8Array(req.body)
				: undefined,
	});
}
