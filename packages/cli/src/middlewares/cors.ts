import type { RequestHandler } from 'express';

const { NODE_ENV } = process.env;
const inDevelopment = !NODE_ENV || NODE_ENV === 'development';

export const corsMiddleware: RequestHandler = (req, res, next) => {
	if (inDevelopment && 'origin' in req.headers) {
		// Allow access also from frontend when developing
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept, sessionid',
		);
	}
	next();
};
