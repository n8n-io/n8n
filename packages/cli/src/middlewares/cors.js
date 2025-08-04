'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.corsMiddleware = void 0;
const corsMiddleware = (req, res, next) => {
	if ('origin' in req.headers) {
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
exports.corsMiddleware = corsMiddleware;
//# sourceMappingURL=cors.js.map
