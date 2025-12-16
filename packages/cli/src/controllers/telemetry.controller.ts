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

	@Post('/proxy/:version/track', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	@Post('/proxy/:version/identify', { skipAuth: true, rateLimit: true })
	async identify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	@Post('/proxy/:version/page', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}
	@Get('/rudderstack/sourceConfig', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sourceConfig(_: Request, res: Response) {
		const response = await fetch('https://api-rs.n8n.io/sourceConfig', {
			headers: {
				authorization:
					'Basic ' + btoa(`${this.globalConfig.diagnostics.frontendConfig.split(';')[0]}:`),
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch source config: ${response.statusText}`);
		}

		const config: unknown = await response.json();

		// write directly to response to avoid wrapping the config in `data` key which is not expected by RudderStack sdk
		res.json(config);
	}
}
