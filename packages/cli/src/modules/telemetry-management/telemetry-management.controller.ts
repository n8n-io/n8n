import { Post, Get, Query, Body, RestController } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import { TelemetryManagementService } from './telemetry-management.service';

interface TrackEventRequest {
	event_name: string;
	properties?: Record<string, any>;
	workflow_id?: string;
	session_id?: string;
}

interface TrackEventsBatchRequest {
	events: Array<{
		event_name: string;
		properties?: Record<string, any>;
		workflow_id?: string;
		session_id?: string;
	}>;
}

interface EventsQuery {
	event_name?: string;
	user_id?: string;
	workflow_id?: string;
	workspace_id?: string;
	start_date?: string;
	end_date?: string;
	limit?: string;
	offset?: string;
}

interface OverviewQuery {
	start_date?: string;
	end_date?: string;
	workspace_id?: string;
}

interface TopEventsQuery {
	start_date?: string;
	end_date?: string;
	limit?: string;
}

interface ActiveUsersQuery {
	start_date?: string;
	end_date?: string;
}

interface ExportQuery {
	format?: 'csv' | 'json';
	event_name?: string;
	user_id?: string;
	workflow_id?: string;
	workspace_id?: string;
	start_date?: string;
	end_date?: string;
}

@RestController('/telemetry')
export class TelemetryManagementController {
	constructor(private readonly telemetryService: TelemetryManagementService) {}

	/**
	 * POST /api/telemetry/events
	 * Track single event
	 */
	@Post('/events')
	async trackEvent(req: AuthenticatedRequest, @Body data: TrackEventRequest) {
		await this.telemetryService.trackEvent({
			eventName: data.event_name,
			properties: data.properties,
			userId: req.user.id,
			workflowId: data.workflow_id,
			sessionId: data.session_id,
			source: 'frontend',
		});

		return { success: true };
	}

	/**
	 * POST /api/telemetry/events/batch
	 * Track events in batch
	 */
	@Post('/events/batch')
	async trackEventsBatch(req: AuthenticatedRequest, @Body data: TrackEventsBatchRequest) {
		await this.telemetryService.trackEventsBatch(
			data.events.map((event) => ({
				eventName: event.event_name,
				properties: event.properties,
				userId: req.user.id,
				workflowId: event.workflow_id,
				sessionId: event.session_id,
				source: 'frontend' as const,
			})),
		);

		return { success: true };
	}

	/**
	 * GET /api/telemetry/events
	 * Query events list (admin only)
	 */
	@Get('/events')
	async getEvents(_req: AuthenticatedRequest, @Query query: EventsQuery) {
		return await this.telemetryService.getEvents({
			eventName: query.event_name,
			userId: query.user_id,
			workflowId: query.workflow_id,
			workspaceId: query.workspace_id,
			startDate: query.start_date ? new Date(query.start_date) : undefined,
			endDate: query.end_date ? new Date(query.end_date) : undefined,
			limit: query.limit ? parseInt(query.limit) : 100,
			offset: query.offset ? parseInt(query.offset) : 0,
		});
	}

	/**
	 * GET /api/telemetry/stats/overview
	 * Get statistics overview
	 */
	@Get('/stats/overview')
	async getOverview(_req: AuthenticatedRequest, @Query query: OverviewQuery) {
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		return await this.telemetryService.getOverview({
			startDate: query.start_date ? new Date(query.start_date) : sevenDaysAgo,
			endDate: query.end_date ? new Date(query.end_date) : now,
			workspaceId: query.workspace_id,
		});
	}

	/**
	 * GET /api/telemetry/stats/top-events
	 * Get top events by count
	 */
	@Get('/stats/top-events')
	async getTopEvents(_req: AuthenticatedRequest, @Query query: TopEventsQuery) {
		return await this.telemetryService.getTopEvents({
			startDate: query.start_date ? new Date(query.start_date) : undefined,
			endDate: query.end_date ? new Date(query.end_date) : undefined,
			limit: query.limit ? parseInt(query.limit) : 20,
		});
	}

	/**
	 * GET /api/telemetry/stats/active-users
	 * Get active user statistics by date
	 */
	@Get('/stats/active-users')
	async getActiveUserStats(_req: AuthenticatedRequest, @Query query: ActiveUsersQuery) {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		const stats = await this.telemetryService.getActiveUserStats({
			startDate: query.start_date ? new Date(query.start_date) : thirtyDaysAgo,
			endDate: query.end_date ? new Date(query.end_date) : now,
		});

		return { stats };
	}

	/**
	 * GET /api/telemetry/export
	 * Export telemetry events (admin only)
	 */
	@Get('/export')
	async exportEvents(_req: AuthenticatedRequest, res: Response, @Query query: ExportQuery) {
		const format = query.format || 'csv';

		const filters = {
			eventName: query.event_name,
			userId: query.user_id,
			workflowId: query.workflow_id,
			workspaceId: query.workspace_id,
			startDate: query.start_date ? new Date(query.start_date) : undefined,
			endDate: query.end_date ? new Date(query.end_date) : undefined,
		};

		const dateStr = new Date().toISOString().split('T')[0];

		if (format === 'csv') {
			const content = await this.telemetryService.exportEventsAsCsv(filters);
			const filename = `telemetry-events-${dateStr}.csv`;

			res.setHeader('Content-Type', 'text/csv; charset=utf-8');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

			return content;
		} else {
			const content = await this.telemetryService.exportEventsAsJson(filters);
			const filename = `telemetry-events-${dateStr}.json`;

			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

			return content;
		}
	}
}
