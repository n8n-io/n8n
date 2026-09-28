import type { Request, Response } from 'express';

/**
 * The served page runs on an opaque origin (`sandbox` CSP), so `null` is the only
 * `Origin` the app itself can send. The instance origin is allowed too, and a request
 * without `Origin` (same-origin, curl) has nothing to check. Every other origin is
 * another site: it gets a 403 and no CORS headers, so a browser never reads the answer.
 */
export function applyCors(req: Request, res: Response, instanceBaseUrl: string): boolean {
	// The dev-only global cors middleware sets this before the controller runs. This
	// public route never allows credentials, so drop it.
	res.removeHeader('Access-Control-Allow-Credentials');

	const origin = req.headers.origin;
	const instanceOrigin = new URL(instanceBaseUrl).origin;
	if (origin !== undefined && origin !== 'null' && origin !== instanceOrigin) {
		res.status(403).json({
			code: 'forbidden_origin',
			message: 'The app runtime API answers only its own page.',
		});
		return false;
	}

	if (origin !== undefined) res.setHeader('Access-Control-Allow-Origin', origin);
	res.vary('Origin');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	return true;
}
