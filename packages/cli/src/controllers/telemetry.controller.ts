import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { TelemetryManagementService } from '@/modules/telemetry-management/telemetry-management.service';

interface TrackPayload {
	event?: string;
	properties?: Record<string, any>;
	userId?: string;
}

interface BatchEvent {
	event_name: string;
	properties?: Record<string, any>;
	timestamp: string;
}

interface BatchPayload {
	events: BatchEvent[];
}

@RestController('/telemetry')
export class TelemetryController {
	proxy;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly telemetryManagementService: TelemetryManagementService,
	) {
		// Only create proxy if diagnostics is enabled and config is valid
		const proxyTarget = this.globalConfig.diagnostics.frontendConfig.split(';')[1];
		if (this.globalConfig.diagnostics.enabled && proxyTarget) {
			this.proxy = createProxyMiddleware({
				target: proxyTarget,
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
	}

	@Post('/events/batch', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async trackBatch(req: AuthenticatedRequest, res: Response) {
		const body = req.body as BatchPayload;

		if (body.events && Array.isArray(body.events)) {
			const events = body.events.map((event) => ({
				eventName: event.event_name,
				properties: event.properties || {},
				userId: req.user?.id,
				source: 'frontend' as const,
			}));

			await this.telemetryManagementService.trackEventsBatch(events);
		}

		res.status(200).json({ success: true });
	}

	@Post('/proxy/:version/track', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		// Track to local database
		const body = req.body as TrackPayload;
		if (body.event) {
			void this.telemetryManagementService.trackEvent({
				eventName: body.event,
				properties: body.properties || {},
				userId: body.userId,
				source: 'frontend',
			});
		}

		// Also proxy to external service if enabled and proxy is configured
		if (this.globalConfig.diagnostics.enabled && this.proxy) {
			await this.proxy(req, res, next);
		} else {
			res.status(200).json({ success: true });
		}
	}

	@Post('/proxy/:version/identify', { skipAuth: true, rateLimit: true })
	async identify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (this.globalConfig.diagnostics.enabled && this.proxy) {
			await this.proxy(req, res, next);
		} else {
			res.status(200).json({ success: true });
		}
	}

	@Post('/proxy/:version/page', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (this.globalConfig.diagnostics.enabled && this.proxy) {
			await this.proxy(req, res, next);
		} else {
			res.status(200).json({ success: true });
		}
	}

	@Get('/rudderstack/sourceConfig', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sourceConfig(_: Request, res: Response) {
		if (this.globalConfig.diagnostics.enabled) {
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
		} else {
			// Return a minimal config when diagnostics is disabled
			res.json({ source: { config: {} } });
		}
	}

	@Get('/stats/overview')
	async getStatsOverview(req: AuthenticatedRequest<{}, {}, {}, { days?: string }>, res: Response) {
		const days = parseInt(req.query.days ?? '30') || 30;
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		const stats = await this.telemetryManagementService.getOverview({
			startDate,
			endDate,
		});

		res.json(stats);
	}

	@Get('/stats/top-events')
	async getTopEvents(
		req: AuthenticatedRequest<{}, {}, {}, { limit?: string; days?: string }>,
		res: Response,
	) {
		const limit = parseInt(req.query.limit ?? '20') || 20;
		const days = parseInt(req.query.days ?? '30') || 30;

		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		const topEvents = await this.telemetryManagementService.getTopEvents({
			startDate,
			endDate,
			limit,
		});

		res.json(topEvents);
	}

	@Get('/stats/active-users')
	async getActiveUsers(req: AuthenticatedRequest<{}, {}, {}, { days?: string }>, res: Response) {
		const days = parseInt(req.query.days ?? '30') || 30;
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		const activeUsers = await this.telemetryManagementService.getActiveUserStats({
			startDate,
			endDate,
		});

		res.json(activeUsers);
	}
}
