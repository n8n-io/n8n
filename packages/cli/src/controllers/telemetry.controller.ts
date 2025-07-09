import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

@RestController('/telemetry')
export class TelemetryController {
	proxy;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.proxy = createProxyMiddleware({
			target: this.globalConfig.diagnostics.frontendConfig.split(';')[1],
			changeOrigin: true,
			pathRewrite: {
				'^/proxy/': '/', // /proxy/v1/track -> /v1/track
			},
			on: {
				proxyReq: (proxyReq, req) => {
					proxyReq.removeHeader('cookie');
					fixRequestBody(proxyReq, req);
					return;
				},
			},
		});
	}

	@Post('/proxy/:version/track')
	async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}

	@Post('/proxy/:version/identify')
	async identify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}

	@Post('/proxy/:version/page')
	async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}
}
