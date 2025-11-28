import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

@RestController('/posthog')
export class PostHogController {
	proxy;

	constructor(private readonly globalConfig: GlobalConfig) {
		const targetUrl = this.globalConfig.diagnostics.posthogConfig.apiHost;

		this.proxy = createProxyMiddleware({
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
	}

	// Main event capture endpoint
	@Post('/capture/', {
		skipAuth: true,
		rateLimit: { limit: 200, windowMs: 60_000 },
		usesTemplates: true,
	})
	async capture(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Feature flags and configuration
	@Post('/decide/', {
		skipAuth: true,
		rateLimit: { limit: 100, windowMs: 60_000 },
		usesTemplates: true,
	})
	async decide(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Session recording events
	@Post('/s/', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sessionRecording(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Session recording events (alternative endpoint)
	@Post('/e/', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sessionEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Person/profile updates
	@Post('/engage/', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async engage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Batch endpoint (for multiple events)
	@Post('/batch/', {
		skipAuth: true,
		rateLimit: { limit: 100, windowMs: 60_000 },
		usesTemplates: true,
	})
	async batch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Feature flags endpoint - /flags/
	@Post('/flags/', {
		skipAuth: true,
		rateLimit: { limit: 100, windowMs: 60_000 },
		usesTemplates: true,
	})
	async flags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Ingestion API - versioned event endpoint (POST)
	@Post('/i/v0/e/', {
		skipAuth: true,
		rateLimit: { limit: 200, windowMs: 60_000 },
		usesTemplates: true,
	})
	async ingestionEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Ingestion API - versioned event endpoint (GET)
	@Get('/i/v0/e/', {
		skipAuth: true,
		rateLimit: { limit: 200, windowMs: 60_000 },
		usesTemplates: true,
	})
	async ingestionEventsGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Static files - specific endpoint for array.js and lazy-recorder.js
	@Get('/static/array.js', {
		skipAuth: true,
		usesTemplates: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
	})
	async staticArrayJs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	@Get('/static/lazy-recorder.js', {
		skipAuth: true,
		usesTemplates: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
	})
	async staticLazyRecorderJs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Configuration endpoints for array.js
	@Get('/array/:apiKey/config.js', {
		skipAuth: true,
		rateLimit: { limit: 20, windowMs: 60_000 },
		usesTemplates: true,
	})
	async arrayConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}
}
