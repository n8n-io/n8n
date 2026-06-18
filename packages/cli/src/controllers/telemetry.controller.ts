import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Options, Post, RestController } from '@n8n/decorators';
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
				proxyRes: (proxyRes) => {
					// MCP app UIs call this cross-origin from sandboxed iframes. Upstream
					// may set CORS headers too, so normalize to one permissive value.
					for (const header of [
						'access-control-allow-origin',
						'access-control-allow-credentials',
						'access-control-allow-methods',
						'access-control-allow-headers',
						'access-control-expose-headers',
					]) {
						delete proxyRes.headers[header];
					}
					proxyRes.headers['access-control-allow-origin'] = '*';
				},
				error: (_error, _req, res) => {
					if ('writeHead' in res && !res.headersSent) {
						res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
						res.end('Bad Gateway');
					}
				},
			},
		});
	}

	private applyCors(req: AuthenticatedRequest, res: Response) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

		const requestedHeaders = req.headers['access-control-request-headers'];
		res.setHeader(
			'Access-Control-Allow-Headers',
			typeof requestedHeaders === 'string' && requestedHeaders.length > 0
				? requestedHeaders
				: 'Content-Type, Authorization, anonymousId',
		);
		res.setHeader('Access-Control-Max-Age', '600');
		res.removeHeader('Access-Control-Allow-Credentials');
	}

	// Public telemetry passthrough: no scope decorator. The endpoint is unauthenticated,
	// cookie-stripped, rate-limited, and proxies only to the fixed diagnostics target.
	@Options('/proxy/:version/:action', {
		skipAuth: true,
		ipRateLimit: { limit: 100, windowMs: 60_000 },
	})
	proxyPreflight(req: AuthenticatedRequest, res: Response) {
		this.applyCors(req, res);
		res.status(204).end();
	}

	// Public telemetry passthrough: no scope decorator. The endpoint is unauthenticated,
	// cookie-stripped, rate-limited, and proxies only to the fixed diagnostics target.
	@Post('/proxy/:version/track', { skipAuth: true, ipRateLimit: { limit: 100, windowMs: 60_000 } })
	async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.applyCors(req, res);
		await this.proxy(req, res, next);
	}

	// Public telemetry passthrough: no scope decorator. The endpoint is unauthenticated,
	// cookie-stripped, rate-limited, and proxies only to the fixed diagnostics target.
	@Post('/proxy/:version/identify', {
		skipAuth: true,
		ipRateLimit: { limit: 100, windowMs: 60_000 },
	})
	async identify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.applyCors(req, res);
		await this.proxy(req, res, next);
	}

	// Public telemetry passthrough: no scope decorator. The endpoint is unauthenticated,
	// cookie-stripped, rate-limited, and proxies only to the fixed diagnostics target.
	@Post('/proxy/:version/page', { skipAuth: true, ipRateLimit: { limit: 50, windowMs: 60_000 } })
	async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		this.applyCors(req, res);
		await this.proxy(req, res, next);
	}

	// Public RudderStack SDK source-config passthrough: no scope decorator. It uses
	// the instance write key server-side and returns only the SDK config.
	@Options('/rudderstack/sourceConfig', {
		skipAuth: true,
		ipRateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	sourceConfigPreflight(req: AuthenticatedRequest, res: Response) {
		this.applyCors(req, res);
		res.status(204).end();
	}

	// Public RudderStack SDK source-config passthrough: no scope decorator. It uses
	// the instance write key server-side and returns only the SDK config.
	@Get('/rudderstack/sourceConfig', {
		skipAuth: true,
		ipRateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sourceConfig(req: AuthenticatedRequest, res: Response) {
		this.applyCors(req, res);

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
