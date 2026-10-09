import type { Request, Response } from 'express';

/** Only the app origin may send browser requests to its cookie-backed API. */
export function applyCors(req: Request, res: Response, appBaseUrl: string): boolean {
	// Remove headers from the development server's global CORS middleware.
	res.removeHeader('Access-Control-Allow-Credentials');
	res.removeHeader('Access-Control-Allow-Origin');

	const origin = req.headers.origin;
	const appOrigin = new URL(appBaseUrl).origin;
	if (origin !== undefined && origin !== appOrigin) {
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
