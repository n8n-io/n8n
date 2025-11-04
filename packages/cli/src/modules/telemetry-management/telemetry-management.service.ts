import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { TelemetryEvent } from '@n8n/db';
import { Between } from '@n8n/typeorm';

import { TelemetryEventRepository } from './repositories/telemetry-event.repository';

interface TrackEventData {
	eventName: string;
	properties?: Record<string, any>;
	userId?: string;
	workflowId?: string;
	workspaceId?: string;
	sessionId?: string;
	instanceId?: string;
	source: 'frontend' | 'backend';
}

@Service()
export class TelemetryManagementService {
	private readonly scopedLogger: Logger;

	constructor(
		private readonly telemetryEventRepository: TelemetryEventRepository,
		logger: Logger,
	) {
		this.scopedLogger = logger.scoped('telemetry');
	}

	/**
	 * Track single event
	 */
	async trackEvent(data: TrackEventData): Promise<void> {
		try {
			await this.telemetryEventRepository.save({
				eventName: data.eventName,
				properties: data.properties || {},
				userId: data.userId || null,
				workflowId: data.workflowId || null,
				workspaceId: data.workspaceId || null,
				sessionId: data.sessionId || null,
				instanceId: data.instanceId || null,
				source: data.source,
				createdAt: new Date(),
			});
		} catch (error) {
			this.scopedLogger.error('Failed to track event', { eventName: data.eventName, error });
		}
	}

	/**
	 * Track events in batch
	 */
	async trackEventsBatch(events: TrackEventData[]): Promise<void> {
		try {
			const entities = events.map((event) => ({
				eventName: event.eventName,
				properties: event.properties || {},
				userId: event.userId || null,
				workflowId: event.workflowId || null,
				workspaceId: event.workspaceId || null,
				sessionId: event.sessionId || null,
				instanceId: event.instanceId || null,
				source: event.source,
				createdAt: new Date(),
			}));

			await this.telemetryEventRepository.createBatch(entities);
		} catch (error) {
			this.scopedLogger.error('Failed to track events batch', { count: events.length, error });
		}
	}

	/**
	 * Query events with filters
	 */
	async getEvents(filters: {
		eventName?: string;
		userId?: string;
		workflowId?: string;
		workspaceId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}): Promise<{ events: TelemetryEvent[]; total: number }> {
		return await this.telemetryEventRepository.findWithFilters(filters);
	}

	/**
	 * Get statistics overview
	 */
	async getOverview(filters: {
		startDate: Date;
		endDate: Date;
		workspaceId?: string;
	}): Promise<{
		totalEvents: number;
		activeUsers: number;
		topEvents: Array<{ event_name: string; count: number }>;
	}> {
		const whereClause: any = {
			createdAt: Between(filters.startDate, filters.endDate),
		};

		if (filters.workspaceId) {
			whereClause.workspaceId = filters.workspaceId;
		}

		const [totalEvents, activeUsersResult, topEvents] = await Promise.all([
			this.telemetryEventRepository.count({ where: whereClause }),
			this.telemetryEventRepository
				.createQueryBuilder('event')
				.select('COUNT(DISTINCT event.userId)', 'count')
				.where('event.createdAt BETWEEN :start AND :end', {
					start: filters.startDate,
					end: filters.endDate,
				})
				.andWhere(filters.workspaceId ? 'event.workspaceId = :workspaceId' : '1=1', {
					workspaceId: filters.workspaceId,
				})
				.getRawOne(),
			this.telemetryEventRepository.getTopEvents({
				startDate: filters.startDate,
				endDate: filters.endDate,
				limit: 10,
			}),
		]);

		return {
			totalEvents,
			activeUsers: parseInt(activeUsersResult?.count || '0'),
			topEvents,
		};
	}

	/**
	 * Get top events statistics
	 */
	async getTopEvents(filters: {
		startDate?: Date;
		endDate?: Date;
		limit?: number;
	}): Promise<Array<{ event_name: string; count: number }>> {
		return await this.telemetryEventRepository.getTopEvents(filters);
	}

	/**
	 * Get active user statistics by date
	 */
	async getActiveUserStats(filters: {
		startDate: Date;
		endDate: Date;
	}): Promise<Array<{ date: string; active_users: number }>> {
		return await this.telemetryEventRepository.getActiveUserStats(filters);
	}

	/**
	 * Export events as CSV
	 */
	async exportEventsAsCsv(filters: {
		eventName?: string;
		userId?: string;
		workflowId?: string;
		workspaceId?: string;
		startDate?: Date;
		endDate?: Date;
	}): Promise<string> {
		const { events } = await this.telemetryEventRepository.findWithFilters({
			...filters,
			limit: 10000, // Max export limit
			offset: 0,
		});

		// CSV Headers
		const headers = [
			'ID',
			'Event Name',
			'User ID',
			'Workflow ID',
			'Workspace ID',
			'Session ID',
			'Instance ID',
			'Source',
			'Created At',
			'Properties',
		];

		// Convert events to CSV rows
		const rows = events.map((event) => [
			event.id,
			event.eventName,
			event.userId || '',
			event.workflowId || '',
			event.workspaceId || '',
			event.sessionId || '',
			event.instanceId || '',
			event.source,
			event.createdAt.toISOString(),
			JSON.stringify(event.properties),
		]);

		// Build CSV
		const csvLines = [
			headers.join(','),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
			),
		];

		return csvLines.join('\n');
	}

	/**
	 * Export events as JSON
	 */
	async exportEventsAsJson(filters: {
		eventName?: string;
		userId?: string;
		workflowId?: string;
		workspaceId?: string;
		startDate?: Date;
		endDate?: Date;
	}): Promise<string> {
		const { events } = await this.telemetryEventRepository.findWithFilters({
			...filters,
			limit: 10000, // Max export limit
			offset: 0,
		});

		return JSON.stringify(
			{
				exportedAt: new Date().toISOString(),
				total: events.length,
				filters,
				events: events.map((event) => ({
					id: event.id,
					eventName: event.eventName,
					properties: event.properties,
					userId: event.userId,
					workflowId: event.workflowId,
					workspaceId: event.workspaceId,
					sessionId: event.sessionId,
					instanceId: event.instanceId,
					source: event.source,
					createdAt: event.createdAt,
				})),
			},
			null,
			2,
		);
	}

	/**
	 * Prune old events (data retention)
	 */
	async pruneOldEvents(retentionDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

		const deletedCount = await this.telemetryEventRepository.deleteOlderThan(cutoffDate);

		this.scopedLogger.info(`Pruned ${deletedCount} old telemetry events`, {
			cutoffDate,
			retentionDays,
		});

		return deletedCount;
	}
}
