import type { RequestHandler } from 'express';

/**
 * Check if the origin is from localhost or Docker internal networks.
 * This is secure because:
 * - Localhost requests come from the same machine
 * - Docker container-to-container traffic stays within the Docker network
 * - External traffic should be handled by a reverse proxy which adds CORS headers
 */
function isLocalOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		const hostname = url.hostname;

		// Allow localhost variants
		if (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '::1' ||
			hostname === '0.0.0.0'
		) {
			return true;
		}

		// Allow Docker internal networks (172.16.0.0/12 covers 172.16.0.0 - 172.31.255.255)
		if (
			hostname.startsWith('172.') ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.')
		) {
			return true;
		}

		// Allow .local domains (common for Docker Compose)
		if (hostname.endsWith('.local')) {
			return true;
		}

		return false;
	} catch {
		// Invalid URL, don't allow
		return false;
	}
}

export const corsMiddleware: RequestHandler = (req, res, next) => {
	const origin = req.headers.origin;

	// Only allow CORS for local origins (localhost, Docker networks)
	// External requests should be handled by reverse proxy
	if (origin && isLocalOrigin(origin)) {
		res.header('Access-Control-Allow-Origin', origin);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept, push-ref, browser-id, anonymousid, authorization, x-authorization',
		);
	}

	if (req.method === 'OPTIONS') {
		res.writeHead(204).end();
	} else {
		next();
	}
};
