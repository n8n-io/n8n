import type { RequestHandler } from 'express';

const ORIGIN_LEVEL_WELL_KNOWN =
	/^\/\.well-known\/oauth-(authorization-server|protected-resource)(\/|$)/;

/**
 * RFC 8414 and RFC 9728 place OAuth discovery documents at the origin, with the issuer
 * or resource path after the well-known name. When n8n runs under a base path, its
 * routes are mounted under that path, so this middleware forwards those origin-level
 * requests to the mounted routes.
 */
export const createWellKnownBasePathMiddleware = (basePath: string): RequestHandler => {
	return (req, _res, next) => {
		if (basePath !== '/' && ORIGIN_LEVEL_WELL_KNOWN.test(req.path)) {
			req.url = `${basePath}${req.url}`;
		}
		next();
	};
};
