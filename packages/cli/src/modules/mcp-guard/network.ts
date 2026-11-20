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

/** Sends a captured request to the real network. Use it for the real read of a decision. */
export async function sendToNetwork(req: CapturedRequest): Promise<Response> {
	const headers = Object.fromEntries(
		Object.entries(req.headers).filter(([name]) => !SET_BY_CLIENT.has(name.toLowerCase())),
	);
	return await fetch(req.url, {
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
