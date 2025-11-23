import type { RequestHandler } from 'express';

export const corsMiddleware: RequestHandler = (req, res, next) => {
	if ('origin' in req.headers) {
		// Allow access also from frontend when developing
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept, push-ref, browser-id, anonymousid, authorization',
		);
	}

	if (req.method === 'OPTIONS') {
		res.writeHead(204).end();
	} else {
		next();
	}
};
