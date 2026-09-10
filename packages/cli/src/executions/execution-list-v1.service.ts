import type { SerializedCursor } from '@n8n/api-types';
import { DatabaseConfig } from '@n8n/config';
import type { ExecutionSummaries } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ExecutionStatusList, type ExecutionStatus, type ExecutionSummary } from 'n8n-workflow';

import { encodeExecutionCursor, type ExecutionCursor } from './execution-cursor';

export interface ListExecutionsResponse {
	results: ExecutionSummary[];
	nextCursor: SerializedCursor | null;
	count: number;
	estimated: boolean;
}

/** "Current" means enqueued to start or running; everything else is completed. */
export const CURRENT_STATUSES: ExecutionStatus[] = ['new', 'running'];

export const COMPLETED_STATUSES = ExecutionStatusList.filter(
	(status) => !CURRENT_STATUSES.includes(status),
);

/** Provides the logic for listing engine v1 executions */
@Service()
export class ExecutionListV1Service {
	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly executionRepository: ExecutionRepository,
	) {}

	/**
	 * Find summaries of executions that satisfy a query.
	 *
	 * Return also the total count of all executions that satisfy the query,
	 * and whether the total is an estimate or not.
	 */
	async findPageWithCount(
		query: ExecutionSummaries.RangeQuery,
		cursor?: ExecutionCursor,
	): Promise<ListExecutionsResponse> {
		const pagedQuery: ExecutionSummaries.RangeQuery = {
			...query,
			range: { ...query.range, beforeId: cursor?.v1?.id ?? query.range.beforeId },
		};
		const { range: _, ...countQuery } = pagedQuery;

		const [results, executionCount] = await Promise.all([
			this.executionRepository.findManyByRangeQuery(pagedQuery),
			this.getExecutionsCountForQuery({ ...countQuery, kind: 'count' }),
		]);

		return {
			results,
			nextCursor: this.nextCursorFor(results, pagedQuery.range.limit),
			...executionCount,
		};
	}

	/**
	 * Return:
	 *
	 * - the summaries of latest current and completed executions that satisfy a query,
	 * - the total count of all completed executions that satisfy the query, and
	 * - whether the total of completed executions is an estimate.
	 *
	 * By default, "current" means executions starting and running. With concurrency
	 * control, "current" means executions enqueued to start and running.
	 *
	 * @param query the completed-only page query. The current block overrides the
	 * status, order and range itself, so that narrowing does not reach it.
	 */
	async findCurrentAndCompleted(
		query: ExecutionSummaries.RangeQuery,
	): Promise<ListExecutionsResponse> {
		const { range: _, ...countQuery } = query;

		const [current, completed, completedCount] = await Promise.all([
			this.findCurrentExecutions(query),
			this.executionRepository.findManyByRangeQuery(query),
			this.getExecutionsCountForQuery({ ...countQuery, kind: 'count' }),
		]);

		return {
			results: current.concat(completed),
			// Only the completed page is paginated; "current" is refetched in full each time.
			nextCursor: this.nextCursorFor(completed, query.range.limit),
			count: completedCount.count, // exclude current from count for pagination
			estimated: completedCount.estimated,
		};
	}

	async findCurrentExecutions(query: ExecutionSummaries.RangeQuery) {
		const currentQuery: ExecutionSummaries.RangeQuery = {
			...query,
			// "current" is refetched in full on every page, so it ignores the cursor.
			range: {
				limit: query.range.limit,
			},
			status: CURRENT_STATUSES,
			order: { top: 'running' }, // ensure limit cannot exclude running
		};

		return await this.executionRepository.findManyByRangeQuery(currentQuery);
	}

	/** Cursor to continue a page, or `null` when a partial page means there's nothing more. */
	private nextCursorFor(rows: ExecutionSummary[], limit: number): SerializedCursor | null {
		if (rows.length < limit) return null;

		const lastRow = rows[rows.length - 1];
		if (!lastRow) return null;

		return encodeExecutionCursor({
			version: 1,
			v1: {
				id: lastRow.id,
				timestamp: new Date(lastRow.startedAt ?? lastRow.createdAt).toISOString(),
			},
		});
	}

	/**
	 * @param countQuery the query to count executions
	 * @returns
	 *  - the count of executions that satisfy the query
	 *  - whether the count is an estimate or not
	 */
	async getExecutionsCountForQuery(countQuery: ExecutionSummaries.CountQuery) {
		if (this.databaseConfig.type === 'postgresdb') {
			const liveRows = await this.executionRepository.getLiveExecutionRowsOnPostgres();

			if (liveRows === -1) return { count: -1, estimated: false };

			if (liveRows > 100_000) {
				// likely too high to fetch exact count fast
				return { count: liveRows, estimated: true };
			}
		}

		const count = await this.executionRepository.fetchCount(countQuery);

		return { count, estimated: false };
	}
}
