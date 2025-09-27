import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

@RestController('/posthog')
export class PostHogController {
	proxy;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.proxy = createProxyMiddleware({
			target: this.globalConfig.diagnostics.posthogConfig.apiHost,
			changeOrigin: true,
			pathRewrite: {
				'^/posthog/': '/', // Remove /posthog prefix, keep the rest
			},
			on: {
				proxyReq: (proxyReq, req) => {
					// Remove cookies for privacy
					proxyReq.removeHeader('cookie');

					console.log('Proxying request to PostHog:', req.method, req.url);

					// // Add the API key to the request body for PostHog authentication
					// if (req.body && typeof req.body === 'object') {
					// 	req.body.token = this.globalConfig.diagnostics.posthogConfig.apiKey;
					// }

					fixRequestBody(proxyReq, req);

					//@ts-ignore
					console.log('Modified proxy request headers:', req.body);
				},
				// proxyRes: (proxyRes, req, res) => {
				// 	// Add CORS headers if needed
				// 	proxyRes.headers['Access-Control-Allow-Origin'] = '*';
				// 	proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
				// 	proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
				// },
			},
		});
	}

	// Main event capture endpoint
	@Post('/capture/', { skipAuth: true, rateLimit: { limit: 200, windowMs: 60_000 } })
	async capture(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Feature flags and configuration
	@Post('/decide/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async decide(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Session recording events
	@Post('/s/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async sessionRecording(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Session recording events (alternative endpoint)
	@Post('/e/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async sessionEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Person/profile updates
	@Post('/engage/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async engage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Configuration endpoint
	@Get('/array/:apiKey/config.js', { skipAuth: true, rateLimit: { limit: 20, windowMs: 60_000 } })
	async arrayConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	@Get('/array/:apiKey/config', { skipAuth: true, rateLimit: { limit: 20, windowMs: 60_000 } })
	async arrayConfigNoExt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Static files (array.js, etc.)
	@Get('/static/:filename', { skipAuth: true, rateLimit: { limit: 20, windowMs: 60_000 } })
	async staticFiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Feature flags endpoint - /flags/
	@Post('/flags/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async flags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Batch endpoint (for multiple events)
	@Post('/batch/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async batch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}

	// Health check endpoint
	@Get('/health/', { skipAuth: true, rateLimit: { limit: 10, windowMs: 60_000 } })
	async health(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		await this.proxy(req, res, next);
	}
}
