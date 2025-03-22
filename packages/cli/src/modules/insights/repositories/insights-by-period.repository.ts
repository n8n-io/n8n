import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { z } from 'zod';

import { sql } from '@/utils/sql';

import { InsightsByPeriod } from '../entities/insights-by-period';
import { TypeToNumber } from '../entities/insights-shared';

const dbType = Container.get(GlobalConfig).database.type;

export const insightsByWorkflowSortingFields = [
	'total',
	'succeeded',
	'failed',
	'timeSaved',
	'runTime',
	'averageRunTime',
];

export type InsightByWorkflowSortBy =
	`${(typeof insightsByWorkflowSortingFields)[number]}:${'asc' | 'desc'}`;

const summaryParser = z
	.object({
		period: z.enum(['previous', 'current']),
		// TODO: extract to abstract-entity
		type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),

		// depending on db engine, sum(value) can be a number or a string - because of big numbers
		total_value: z.union([z.number(), z.string()]),
	})
	.array();

const aggregatedInsightsByWorkflowParser = z
	.object({
		workflowId: z.string(),
		workflowName: z.string().optional(),
		projectId: z.string().optional(),
		projectName: z.string().optional(),
		total: z.union([z.number(), z.string()]),
		succeeded: z.union([z.number(), z.string()]),
		failed: z.union([z.number(), z.string()]),
		failureRate: z.union([z.number(), z.string()]),
		runTime: z.union([z.number(), z.string()]),
		averageRunTime: z.union([z.number(), z.string()]),
		timeSaved: z.union([z.number(), z.string()]),
	})
	.array();

const aggregatedInsightsByTimeParser = z
	.object({
		periodStart: z.string(),
		runTime: z.union([z.number(), z.string()]),
		succeeded: z.union([z.number(), z.string()]),
		failed: z.union([z.number(), z.string()]),
		timeSaved: z.union([z.number(), z.string()]),
	})
	.array();

@Service()
export class InsightsByPeriodRepository extends Repository<InsightsByPeriod> {
	constructor(dataSource: DataSource) {
		super(InsightsByPeriod, dataSource.manager);
	}

	async getPreviousAndCurrentPeriodTypeAggregates(): Promise<
		Array<{
			period: 'previous' | 'current';
			type: 0 | 1 | 2 | 3;
			total_value: string | number;
		}>
	> {
		const cte =
			dbType === 'sqlite'
				? sql`
						SELECT
							datetime('now', '-7 days') AS current_start,
							datetime('now') AS current_end,
							datetime('now', '-14 days') AS previous_start
					`
				: dbType === 'postgresdb'
					? sql`
								SELECT
								(CURRENT_DATE - INTERVAL '7 days')::timestamptz AS current_start,
								CURRENT_DATE::timestamptz AS current_end,
								(CURRENT_DATE - INTERVAL '14 days')::timestamptz AS previous_start
							`
					: sql`
								SELECT
									DATE_SUB(CURDATE(), INTERVAL 7 DAY) AS current_start,
									CURDATE() AS current_end,
									DATE_SUB(CURDATE(), INTERVAL 14 DAY) AS previous_start
							`;

		const rawRows = await this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select(
				sql`
						CASE
							WHEN insights.periodStart >= date_ranges.current_start AND insights.periodStart <= date_ranges.current_end
							THEN 'current'
							ELSE 'previous'
						END
					`,
				'period',
			)
			.addSelect('insights.type', 'type')
			.addSelect('SUM(value)', 'total_value')
			// Use a cross join with the CTE
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			// Filter to only include data from the last 14 days
			.where('insights.periodStart >= date_ranges.previous_start')
			.andWhere('insights.periodStart <= date_ranges.current_end')
			// Group by both period and type
			.groupBy('period')
			.addGroupBy('insights.type')
			.getRawMany();

		return summaryParser.parse(rawRows);
	}

	private parseSortingParams(sortBy: string): [string, 'ASC' | 'DESC'] {
		const [column, order] = sortBy.split(':');
		return [column, order.toUpperCase() as 'ASC' | 'DESC'];
	}

	async getInsightsByWorkflow({
		nbDays,
		skip = 0,
		take = 20,
		sortBy = 'total:desc',
	}: {
		nbDays: number;
		skip?: number;
		take?: number;
		sortBy?: InsightByWorkflowSortBy;
	}) {
		const dateSubQuery =
			dbType === 'sqlite'
				? `datetime('now', '-${nbDays} days')`
				: dbType === 'postgresdb'
					? `CURRENT_DATE - INTERVAL '${nbDays} days'`
					: `DATE_SUB(CURDATE(), INTERVAL ${nbDays} DAY)`;

		const [sortField, sortOrder] = this.parseSortingParams(sortBy);
		const sumOfExecutions = sql`CAST(SUM(CASE WHEN insights.type IN (${TypeToNumber.success.toString()}, ${TypeToNumber.failure.toString()}) THEN value ELSE 0 END) as FLOAT)`;

		const rawRowsQuery = this.createQueryBuilder('insights')
			.select([
				'metadata.workflowId AS "workflowId"',
				'metadata.workflowName AS "workflowName"',
				'metadata.projectId AS "projectId"',
				'metadata.projectName AS "projectName"',
				`SUM(CASE WHEN insights.type = ${TypeToNumber.success} THEN value ELSE 0 END) AS "succeeded"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.failure} THEN value ELSE 0 END) AS "failed"`,
				`SUM(CASE WHEN insights.type IN (${TypeToNumber.success}, ${TypeToNumber.failure}) THEN value ELSE 0 END) AS "total"`,
				sql`CASE
								WHEN ${sumOfExecutions} = 0 THEN 0
								ELSE SUM(CASE WHEN insights.type = ${TypeToNumber.failure.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "failureRate"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.runtime_ms} THEN value ELSE 0 END) AS "runTime"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.time_saved_min} THEN value ELSE 0 END) AS "timeSaved"`,
				sql`CASE
								WHEN ${sumOfExecutions} = 0	THEN 0
								ELSE SUM(CASE WHEN insights.type = ${TypeToNumber.runtime_ms.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "averageRunTime"`,
			])
			.innerJoin('insights.metadata', 'metadata')
			.where(`insights.periodStart >= ${dateSubQuery}`)
			.groupBy('metadata.workflowId')
			.addGroupBy('metadata.workflowName')
			.addGroupBy('metadata.projectId')
			.addGroupBy('metadata.projectName')
			.orderBy(`"${sortField}"`, sortOrder);

		const count = (await rawRowsQuery.getRawMany()).length;
		const rawRows = await rawRowsQuery.offset(skip).limit(take).getRawMany();

		return { count, rows: aggregatedInsightsByWorkflowParser.parse(rawRows) };
	}

	// TODO: add return type once rebased on master and InsightsByTimeAndType is
	// available
	// TODO: add tests
	async getInsightsByTime(nbDays: number) {
		const dateSubQuery =
			dbType === 'sqlite'
				? `datetime('now', '-${nbDays} days')`
				: dbType === 'postgresdb'
					? `CURRENT_DATE - INTERVAL '${nbDays} days'`
					: `DATE_SUB(CURDATE(), INTERVAL ${nbDays} DAY)`;

		const rawRowsQuery = this.createQueryBuilder('insights')
			.select([
				'insights.periodStart AS "periodStart"',
				`SUM(CASE WHEN insights.type = ${TypeToNumber.runtime_ms} THEN value ELSE 0 END) AS "runTime"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.success} THEN value ELSE 0 END) AS "succeeded"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.failure} THEN value ELSE 0 END) AS "failed"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.time_saved_min} THEN value ELSE 0 END) AS "timeSaved"`,
			])
			.where(`insights.periodStart >= ${dateSubQuery}`)
			.addGroupBy('insights.periodStart') // TODO: group by specific time scale (start with day)
			.orderBy('insights.periodStart', 'ASC');

		const rawRows = await rawRowsQuery.getRawMany();

		return aggregatedInsightsByTimeParser.parse(rawRows);
	}
}
