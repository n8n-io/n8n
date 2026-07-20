import { GlobalConfig } from '@n8n/config';
import { sql } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, LessThanOrEqual, Repository } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { getDateRangesCommonTableExpressionQuery } from './insights-by-period-query.helper';
import { InsightsByPeriod } from '../entities/insights-by-period';
import type { PeriodUnit, TypeUnit } from '../entities/insights-shared';
import { PeriodUnitToNumber, TypeToNumber } from '../entities/insights-shared';

const dbType = Container.get(GlobalConfig).database.type;
const displayTypeName = {
	[TypeToNumber.success]: 'succeeded',
	[TypeToNumber.failure]: 'failed',
	[TypeToNumber.runtime_ms]: 'runTime',
	[TypeToNumber.time_saved_min]: 'timeSaved',
};

const summaryParser = z
	.object({
		period: z.enum(['previous', 'current']),
		type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),

		// depending on db engine, sum(value) can be a number or a string - because of big numbers
		total_value: z.union([z.number(), z.string()]),
	})
	.array();

const aggregatedInsightsByWorkflowParser = z
	.object({
		workflowId: z.string().nullable(),
		workflowName: z.string(),
		projectId: z.string().nullable(),
		projectName: z.string(),
		total: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		succeeded: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		failed: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		failureRate: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		runTime: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		averageRunTime: z.union([z.number(), z.string()]).transform((value) => Number(value)),
		timeSaved: z.union([z.number(), z.string()]).transform((value) => Number(value)),
	})
	.array();

const optionalNumberLike = z
	.union([z.number(), z.string()])
	.optional()
	.transform((value) => (value !== undefined ? Number(value) : undefined));

const aggregatedInsightsByTimeParser = z
	.object({
		periodStart: z.union([z.date(), z.string()]).transform((value) => {
			if (value instanceof Date) {
				return value.toISOString();
			}

			const parsedDatetime = DateTime.fromSQL(value.toString(), { zone: 'utc' });
			if (parsedDatetime.isValid) {
				return parsedDatetime.toISO();
			}

			// fallback on native date parsing
			return new Date(value).toISOString();
		}),
		runTime: optionalNumberLike,
		succeeded: optionalNumberLike,
		failed: optionalNumberLike,
		timeSaved: optionalNumberLike,
	})
	.array();

@Service()
export class InsightsByPeriodRepository extends Repository<InsightsByPeriod> {
	private isRunningCompaction = false;

	constructor(dataSource: DataSource) {
		super(InsightsByPeriod, dataSource.manager);
	}

	private escapeField(fieldName: string) {
		return this.manager.connection.driver.escape(fieldName);
	}

	private getPeriodFilterExpr(maxAgeInDays = 0) {
		// Database-specific period start expression to filter out data to compact by days matching the periodUnit
		let periodStartExpr = `date('now', '-${maxAgeInDays} days')`;
		if (dbType === 'postgresdb') {
			periodStartExpr = `CURRENT_DATE - INTERVAL '${maxAgeInDays} day'`;
		}

		return periodStartExpr;
	}

	/**
	 * @param timeZoneOffsetMinutes Caller-timezone UTC offset in minutes (e.g. 120 for Europe/Berlin
	 * in summer). Defaults to 0, which keeps this UTC-truncated for internal compaction, where bucket
	 * boundaries must stay timezone-agnostic since they define the stored/deduplicated period keys.
	 */
	private getPeriodStartExpr(periodUnitToCompactInto: PeriodUnit, timeZoneOffsetMinutes = 0) {
		// Database-specific period start expression to truncate timestamp to the periodUnit
		// SQLite by default
		let periodStartExpr =
			periodUnitToCompactInto === 'week'
				? "strftime('%Y-%m-%d 00:00:00.000', date(periodStart, '-6 days', 'weekday 1'))"
				: `strftime('%Y-%m-%d ${periodUnitToCompactInto === 'hour' ? '%H' : '00'}:00:00.000', periodStart)`;
		if (dbType === 'postgresdb') {
			periodStartExpr = `DATE_TRUNC('${periodUnitToCompactInto}', ${this.escapeField('periodStart')})`;
		}

		if (timeZoneOffsetMinutes === 0) {
			return periodStartExpr;
		}

		// Truncating in UTC splits a caller-local day/week across two UTC buckets for non-UTC
		// callers (e.g. an extra prior-day chart bar for positive offsets, LIGO-808). Shift into
		// the caller's local wall-clock time, truncate there, then shift the boundary back to UTC.
		if (dbType === 'postgresdb') {
			const periodField = this.escapeField('periodStart');
			return `DATE_TRUNC('${periodUnitToCompactInto}', ${periodField} + INTERVAL '${timeZoneOffsetMinutes} minutes') - INTERVAL '${timeZoneOffsetMinutes} minutes'`;
		}

		const localTruncatedExpr =
			periodUnitToCompactInto === 'week'
				? `date(periodStart, '${timeZoneOffsetMinutes} minutes', '-6 days', 'weekday 1')`
				: `strftime('%Y-%m-%d ${periodUnitToCompactInto === 'hour' ? '%H' : '00'}:00:00', periodStart, '${timeZoneOffsetMinutes} minutes')`;

		return `strftime('%Y-%m-%d %H:%M:%f', datetime(${localTruncatedExpr}, '${-timeZoneOffsetMinutes} minutes'))`;
	}

	getPeriodInsightsBatchQuery({
		periodUnitToCompactFrom,
		compactionBatchSize,
		maxAgeInDays,
	}: { periodUnitToCompactFrom: PeriodUnit; compactionBatchSize: number; maxAgeInDays: number }) {
		// Build the query to gather period insights data for the batch
		const batchQuery = this.createQueryBuilder()
			.select(
				['id', 'metaId', 'type', 'periodStart', 'value'].map((fieldName) =>
					this.escapeField(fieldName),
				),
			)
			.where(`${this.escapeField('periodUnit')} = ${PeriodUnitToNumber[periodUnitToCompactFrom]}`)
			.andWhere(`${this.escapeField('periodStart')} < ${this.getPeriodFilterExpr(maxAgeInDays)}`)
			.orderBy(this.escapeField('periodStart'), 'ASC')
			.limit(compactionBatchSize);

		return batchQuery as SelectQueryBuilder<{
			id: number;
			metaId: number;
			type: string;
			value: number;
			periodStart: Date;
		}>;
	}

	private getAggregationQuery(periodUnit: PeriodUnit) {
		// Get the start period expression depending on the period unit and database type
		const periodStartExpr = this.getPeriodStartExpr(periodUnit);

		// Function to get the aggregation query
		const aggregationQuery = this.manager
			.createQueryBuilder()
			.select(this.escapeField('metaId'))
			.addSelect(this.escapeField('type'))
			.addSelect(PeriodUnitToNumber[periodUnit].toString(), 'periodUnit')
			.addSelect(periodStartExpr, 'periodStart')
			.addSelect(`SUM(${this.escapeField('value')})`, 'value')
			.from('rows_to_compact', 'rtc')
			.groupBy(this.escapeField('metaId'))
			.addGroupBy(this.escapeField('type'))
			.addGroupBy(periodStartExpr);

		return aggregationQuery;
	}

	/**
	 * Compacts source data into the target period unit
	 */
	async compactSourceDataIntoInsightPeriod({
		sourceBatchQuery,
		sourceTableName = this.metadata.tableName,
		periodUnitToCompactInto,
	}: {
		/**
		 * Query builder to get batch source data. Must return these fields: 'id', 'metaId', 'type', 'periodStart', 'value'.
		 */
		sourceBatchQuery: SelectQueryBuilder<{
			id: number;
			metaId: number;
			type: string;
			value: number;
			periodStart: Date;
		}>;

		/**
		 * The source table name to get source data from.
		 */
		sourceTableName?: string;

		/**
		 * The new period unit to compact the data into.
		 */
		periodUnitToCompactInto: PeriodUnit;
	}): Promise<number> {
		// Skip compaction if the process is already running
		if (this.isRunningCompaction) {
			return 0;
		}
		this.isRunningCompaction = true;

		try {
			// Create temp table that only exists in this transaction for rows to compact
			const getBatchAndStoreInTemporaryTable = sql`
				CREATE TEMPORARY TABLE rows_to_compact AS
				${sourceBatchQuery.getSql()};
			`;

			const countBatch = sql`
				SELECT COUNT(*) ${this.escapeField('rowsInBatch')} FROM rows_to_compact;
			`;

			const targetColumnNamesStr = ['metaId', 'type', 'periodUnit', 'periodStart']
				.map((param) => this.escapeField(param))
				.join(', ');
			const targetColumnNamesWithValue = `${targetColumnNamesStr}, value`;

			// Function to get the aggregation query
			const aggregationQuery = this.getAggregationQuery(periodUnitToCompactInto);

			// Insert or update aggregated data
			const insertQueryBase = sql`
				INSERT INTO ${this.metadata.tableName}
					(${targetColumnNamesWithValue})
				${aggregationQuery.getSql()}
			`;

			// Database-specific duplicate key logic
			const deduplicateQuery = sql`
				ON CONFLICT(${targetColumnNamesStr})
				DO UPDATE SET value = ${this.metadata.tableName}.value + excluded.value
				RETURNING *`;

			const upsertEvents = sql`
				${insertQueryBase}
				${deduplicateQuery}
			`;

			// Delete the processed rows
			const deleteBatch = sql`
				DELETE FROM ${sourceTableName}
				WHERE id IN (SELECT id FROM rows_to_compact);
			`;

			// Clean up
			const dropTemporaryTable = sql`
				DROP TABLE rows_to_compact;
			`;

			const result = await this.manager.transaction(async (trx) => {
				await trx.query(getBatchAndStoreInTemporaryTable);

				await trx.query<Array<{ type: any; value: number }>>(upsertEvents);

				const rowsInBatch = await trx.query<[{ rowsInBatch: number | string }]>(countBatch);

				await trx.query(deleteBatch);
				await trx.query(dropTemporaryTable);

				return Number(rowsInBatch[0].rowsInBatch);
			});

			return result;
		} finally {
			this.isRunningCompaction = false;
		}
	}

	async getPreviousAndCurrentPeriodTypeAggregates({
		startDate,
		endDate,
		projectId,
		timeZone,
	}: { projectId?: string; startDate: Date; endDate: Date; timeZone?: string }): Promise<
		Array<{
			period: 'previous' | 'current';
			type: 0 | 1 | 2 | 3;
			total_value: string | number;
		}>
	> {
		const cte = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate, timeZone });

		const rawRowsQuery = this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select(
				sql`
						CASE
							WHEN insights.periodStart >= date_ranges.start_date AND insights.periodStart < date_ranges.end_date
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
			.where('insights.periodStart >= date_ranges.prev_start_date')
			.andWhere('insights.periodStart < date_ranges.end_date')
			// Group by both period and type
			.groupBy('period')
			.addGroupBy('insights.type');

		if (projectId) {
			rawRowsQuery
				.innerJoin('insights.metadata', 'metadata')
				.andWhere('metadata.projectId = :projectId', { projectId });
		}

		const rawRows = await rawRowsQuery.getRawMany();

		return summaryParser.parse(rawRows);
	}

	private parseSortingParams(sortBy: string): [string, 'ASC' | 'DESC'] {
		const [column, order] = sortBy.split(':');
		return [column, order.toUpperCase() as 'ASC' | 'DESC'];
	}

	private async countInsightsByWorkflowGroups(
		rawRowsQuery: SelectQueryBuilder<InsightsByPeriod>,
	): Promise<number> {
		const resultRow = await this.manager
			.createQueryBuilder()
			.select('COUNT(*)', 'count')
			.from(`(${rawRowsQuery.getQuery()})`, 'workflow_groups')
			.setParameters(rawRowsQuery.getParameters())
			.getRawOne<{ count: string | number }>();

		return Number(resultRow?.count ?? 0);
	}

	async getInsightsByWorkflow({
		startDate,
		endDate,
		skip = 0,
		take = 20,
		sortBy = 'total:desc',
		projectId,
		timeZone,
	}: {
		skip?: number;
		take?: number;
		sortBy?: string;
		projectId?: string;
		startDate: Date;
		endDate: Date;
		timeZone?: string;
	}) {
		const [sortField, sortOrder] = this.parseSortingParams(sortBy);
		const sumOfExecutions = sql`SUM(CASE WHEN insights.type IN (${TypeToNumber.success.toString()}, ${TypeToNumber.failure.toString()}) THEN value ELSE 0 END)`;

		const cte = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate, timeZone });

		const rawRowsQuery = this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select([
				'metadata.workflowId AS "workflowId"',
				'metadata.workflowName AS "workflowName"',
				'metadata.projectId AS "projectId"',
				'metadata.projectName AS "projectName"',
				`SUM(CASE WHEN insights.type = ${TypeToNumber.success} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber.success]}"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.failure} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber.failure]}"`,
				`SUM(CASE WHEN insights.type IN (${TypeToNumber.success}, ${TypeToNumber.failure}) THEN value ELSE 0 END) AS "total"`,
				sql`CASE
								WHEN ${sumOfExecutions} = 0 THEN 0
								ELSE 1.0 * SUM(CASE WHEN insights.type = ${TypeToNumber.failure.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "failureRate"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.runtime_ms} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber.runtime_ms]}"`,
				`SUM(CASE WHEN insights.type = ${TypeToNumber.time_saved_min} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber.time_saved_min]}"`,
				sql`CASE
								WHEN ${sumOfExecutions} = 0	THEN 0
								ELSE 1.0 * SUM(CASE WHEN insights.type = ${TypeToNumber.runtime_ms.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "averageRunTime"`,
			])
			.innerJoin('insights.metadata', 'metadata')
			// Use a cross join with the CTE
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			.where('insights.periodStart >= date_ranges.start_date')
			.andWhere('insights.periodStart < date_ranges.end_date')
			.groupBy('metadata.workflowId')
			.addGroupBy('metadata.workflowName')
			.addGroupBy('metadata.projectId')
			.addGroupBy('metadata.projectName');

		if (projectId) {
			rawRowsQuery.andWhere('metadata.projectId = :projectId', { projectId });
		}

		const paginatedQuery = rawRowsQuery
			.clone()
			.orderBy(this.escapeField(sortField), sortOrder)
			.offset(skip)
			.limit(take);

		const [count, rawRows] = await Promise.all([
			this.countInsightsByWorkflowGroups(rawRowsQuery),
			paginatedQuery.getRawMany(),
		]);

		return { count, rows: aggregatedInsightsByWorkflowParser.parse(rawRows) };
	}

	async getInsightsByTime({
		periodUnit,
		insightTypes,
		projectId,
		startDate,
		endDate,
		timeZone,
	}: {
		periodUnit: PeriodUnit;
		insightTypes: TypeUnit[];
		projectId?: string;
		startDate: Date;
		endDate: Date;
		timeZone?: string;
	}) {
		const cte = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate, timeZone });

		const typesAggregation = insightTypes.map((type) => {
			return `SUM(CASE WHEN insights.type = ${TypeToNumber[type]} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber[type]]}"`;
		});

		// Anchored on startDate so historical ranges bucket using the offset that applied then,
		// rather than today's offset (relevant for zones observing DST).
		const timeZoneOffsetMinutes = timeZone
			? DateTime.fromJSDate(startDate).setZone(timeZone).offset
			: 0;
		const periodStartExpr = this.getPeriodStartExpr(periodUnit, timeZoneOffsetMinutes);

		const rawRowsQuery = this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select([`${periodStartExpr} as "periodStart"`, ...typesAggregation])
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			.where(`${this.escapeField('periodStart')} >= date_ranges.start_date`)
			.andWhere(`${this.escapeField('periodStart')} < date_ranges.end_date`)
			.groupBy(periodStartExpr)
			.orderBy(periodStartExpr, 'ASC');

		if (projectId) {
			rawRowsQuery
				.innerJoin('insights.metadata', 'metadata')
				.andWhere('metadata.projectId = :projectId', { projectId });
		}

		const rawRows = await rawRowsQuery.getRawMany();

		return aggregatedInsightsByTimeParser.parse(rawRows);
	}

	async pruneOldData(maxAgeInDays: number): Promise<{ affected: number | null | undefined }> {
		const thresholdDate = DateTime.now().minus({ days: maxAgeInDays }).startOf('day').toJSDate();
		const result = await this.delete({
			periodStart: LessThanOrEqual(thresholdDate),
		});

		return { affected: result.affected };
	}

	async getEarliestDataDate(): Promise<Date | null> {
		const result = await this.createQueryBuilder('ibp')
			.select('MIN(ibp.periodStart)', 'minDate')
			.getRawOne<{ minDate: Date | string | null }>();
		return result?.minDate ? new Date(result.minDate) : null;
	}
}
