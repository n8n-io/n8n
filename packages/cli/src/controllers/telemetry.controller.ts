import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';
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
	constructor(private readonly telemetryManagementService: TelemetryManagementService) {}

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
	async track(req: AuthenticatedRequest, res: Response) {
		// Track to local database only
		const body = req.body as TrackPayload;
		if (body.event) {
			void this.telemetryManagementService.trackEvent({
				eventName: body.event,
				properties: body.properties || {},
				userId: body.userId,
				source: 'frontend',
			});
		}

		res.status(200).json({ success: true });
	}

	@Post('/proxy/:version/identify', { skipAuth: true, rateLimit: true })
	async identify(_req: AuthenticatedRequest, res: Response) {
		// No-op: identification is handled by the main telemetry service
		res.status(200).json({ success: true });
	}

	@Post('/proxy/:version/page', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async page(_req: AuthenticatedRequest, res: Response) {
		// No-op: page tracking is handled through regular track events
		res.status(200).json({ success: true });
	}

	@Get('/rudderstack/sourceConfig', {
		skipAuth: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
		usesTemplates: true,
	})
	async sourceConfig(_: Request, res: Response) {
		// Always return minimal config - no external service integration
		res.json({ source: { config: {} } });
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
