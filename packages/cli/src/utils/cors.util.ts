import type { Request, Response } from 'express';

/**
 * Apply CORS headers to the response.
 *
 * When the request carries `Origin: null` (e.g. pages served under a CSP
 * `sandbox` directive), pass the configured n8n instance origin as
 * `instanceOrigin` so that reverse proxies that block wildcard `*` responses
 * still forward the header rather than stripping it.
 */
export function applyCors(req: Request, res: Response, instanceOrigin?: string) {
	if (res.getHeader('Access-Control-Allow-Origin')) {
		return;
	}

	const origin = req.headers.origin;

	if (!origin || origin === 'null') {
		res.setHeader('Access-Control-Allow-Origin', instanceOrigin ?? '*');
	} else {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
