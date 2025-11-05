import type { RequestHandler } from 'express';

export const corsMiddleware: RequestHandler = (req, res, next) => {
	if ('origin' in req.headers) {
		const origin = req.headers.origin;

		// 获取允许的源列表（支持环境变量配置）
		const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];
		const isDevelopment = process.env.NODE_ENV === 'development';

		// 开发环境：允许所有源
		// 生产环境：只允许配置的源
		if (isDevelopment || allowedOrigins.length === 0 || allowedOrigins.includes(origin!)) {
			res.header('Access-Control-Allow-Origin', origin);
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			res.header(
				'Access-Control-Allow-Headers',
				'Origin, X-Requested-With, Content-Type, Accept, push-ref, browser-id, anonymousid, authorization',
			);
		}
	}

	if (req.method === 'OPTIONS') {
		res.writeHead(204).end();
	} else {
		next();
	}
};
