import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

@RestController('/ph')
export class PostHogController {
	static routers = [
		{
			path: '/',
			router: (() => {
				const router = Router();
				const globalConfig = Container.get(GlobalConfig);
				const targetUrl = globalConfig.diagnostics.posthogConfig.apiHost;

				const proxy = createProxyMiddleware({
					target: targetUrl,
					changeOrigin: true,
					on: {
						proxyReq: (proxyReq, req) => {
							proxyReq.removeHeader('cookie');

							// For POST requests, forward the raw body directly
							const expressReq = req as AuthenticatedRequest & { rawBody?: Buffer };
							if (req.method === 'POST' && expressReq.rawBody) {
								proxyReq.setHeader('Content-Length', expressReq.rawBody.length.toString());
								proxyReq.write(expressReq.rawBody);
							}
						},
					},
				});

				// Use proxy middleware directly - handles all methods and paths
				router.use(proxy);

				return router;
			})(),
			skipAuth: true,
		},
	];
}
