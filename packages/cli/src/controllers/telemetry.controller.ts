import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
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

	@Post('/proxy/:version/track', { skipAuth: true })
	async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}

	@Post('/proxy/:version/identify', { skipAuth: true })
	async identify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}

	@Post('/proxy/:version/page', { skipAuth: true })
	async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.proxy(req, res, next);
		return;
	}
	@Get('/rudderstack/sourceConfig', { skipAuth: true })
	async sourceConfig() {
		const config = await fetch('https://api-rs.n8n.io/sourceConfig', {
			headers: {
				Authorization:
					'Basic ' + btoa(`${this.globalConfig.diagnostics.frontendConfig.split(';')[0]}:`),
			},
		});

		return await config.json();
	}
}
