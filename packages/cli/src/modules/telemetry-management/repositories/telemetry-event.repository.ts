import { Service } from '@n8n/di';
import { TelemetryEvent } from '@n8n/db';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class TelemetryEventRepository extends Repository<TelemetryEvent> {
	constructor(dataSource: DataSource) {
		super(TelemetryEvent, dataSource.manager);
	}

	/**
	 * Batch insert events
	 */
	async createBatch(events: Array<Partial<TelemetryEvent>>): Promise<void> {
		await this.insert(events);
	}

	/**
	 * Query events with filters and pagination
	 */
	async findWithFilters(filters: {
		eventName?: string;
		userId?: string;
		workflowId?: string;
		workspaceId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}): Promise<{ events: TelemetryEvent[]; total: number }> {
		const query = this.createQueryBuilder('event');

		if (filters.eventName) {
			query.andWhere('event.eventName = :eventName', { eventName: filters.eventName });
		}

		if (filters.userId) {
			query.andWhere('event.userId = :userId', { userId: filters.userId });
		}

		if (filters.workflowId) {
			query.andWhere('event.workflowId = :workflowId', { workflowId: filters.workflowId });
		}

		if (filters.workspaceId) {
			query.andWhere('event.workspaceId = :workspaceId', {
				workspaceId: filters.workspaceId,
			});
		}

		if (filters.startDate && filters.endDate) {
			query.andWhere('event.createdAt BETWEEN :start AND :end', {
				start: filters.startDate,
				end: filters.endDate,
			});
		}

		query.orderBy('event.createdAt', 'DESC');
		query.skip(filters.offset || 0);
		query.take(filters.limit || 100);

		const [events, total] = await query.getManyAndCount();
		return { events, total };
	}

	/**
	 * Get top events by count
	 */
	async getTopEvents(filters: {
		startDate?: Date;
		endDate?: Date;
		limit?: number;
	}): Promise<Array<{ event_name: string; count: number }>> {
		const query = this.createQueryBuilder('event')
			.select('event.eventName', 'event_name')
			.addSelect('COUNT(*)', 'count')
			.groupBy('event.eventName')
			.orderBy('count', 'DESC')
			.limit(filters.limit || 20);

		if (filters.startDate && filters.endDate) {
			query.where('event.createdAt BETWEEN :start AND :end', {
				start: filters.startDate,
				end: filters.endDate,
			});
		}

		return await query.getRawMany();
	}

	/**
	 * Get active user statistics
	 */
	async getActiveUserStats(filters: {
		startDate: Date;
		endDate: Date;
	}): Promise<Array<{ date: string; active_users: number }>> {
		return await this.createQueryBuilder('event')
			.select('DATE(event.createdAt)', 'date')
			.addSelect('COUNT(DISTINCT event.userId)', 'active_users')
			.where('event.createdAt BETWEEN :start AND :end', filters)
			.groupBy('DATE(event.createdAt)')
			.orderBy('date', 'ASC')
			.getRawMany();
	}

	/**
	 * Delete old events (for data retention)
	 */
	async deleteOlderThan(date: Date): Promise<number> {
		const result = await this.createQueryBuilder()
			.delete()
			.where('createdAt < :date', { date })
			.execute();

		return result.affected || 0;
	}
}
