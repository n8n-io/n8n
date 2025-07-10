import { GlobalConfig } from '@n8n/config';
import { sql } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, LessThanOrEqual, Repository } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { z } from 'zod';

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
		workflowId: z.string(),
		workflowName: z.string(),
		projectId: z.string(),
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
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			periodStartExpr = `DATE_SUB(CURRENT_DATE, INTERVAL ${maxAgeInDays} DAY)`;
		}

		return periodStartExpr;
	}

	private getPeriodStartExpr(periodUnitToCompactInto: PeriodUnit) {
		// Database-specific period start expression to truncate timestamp to the periodUnit
		// SQLite by default
		let periodStartExpr =
			periodUnitToCompactInto === 'week'
				? "strftime('%Y-%m-%d 00:00:00.000', date(periodStart, '-6 days', 'weekday 1'))"
				: `strftime('%Y-%m-%d ${periodUnitToCompactInto === 'hour' ? '%H' : '00'}:00:00.000', periodStart)`;
		if (dbType === 'mysqldb' || dbType === 'mariadb') {
			periodStartExpr =
				periodUnitToCompactInto === 'week'
					? "DATE_FORMAT(DATE_SUB(periodStart, INTERVAL WEEKDAY(periodStart) DAY), '%Y-%m-%d 00:00:00')"
					: `DATE_FORMAT(periodStart, '%Y-%m-%d ${periodUnitToCompactInto === 'hour' ? '%H' : '00'}:00:00')`;
		} else if (dbType === 'postgresdb') {
			periodStartExpr = `DATE_TRUNC('${periodUnitToCompactInto}', ${this.escapeField('periodStart')})`;
		}

		return periodStartExpr;
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

	getAggregationQuery(periodUnit: PeriodUnit) {
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
			let deduplicateQuery: string;
			if (dbType === 'mysqldb' || dbType === 'mariadb') {
				deduplicateQuery = sql`
				ON DUPLICATE KEY UPDATE value = value + VALUES(value)`;
			} else {
				deduplicateQuery = sql`
				ON CONFLICT(${targetColumnNamesStr})
				DO UPDATE SET value = ${this.metadata.tableName}.value + excluded.value
				RETURNING *`;
			}

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

	private getAgeLimitQuery(maxAgeInDays: number) {
		if (maxAgeInDays === 0) {
			return dbType === 'sqlite' ? "datetime('now')" : 'NOW()';
		}

		return dbType === 'sqlite'
			? `datetime('now', '-${maxAgeInDays} days')`
			: dbType === 'postgresdb'
				? `NOW() - INTERVAL '${maxAgeInDays} days'`
				: `DATE_SUB(NOW(), INTERVAL ${maxAgeInDays} DAY)`;
	}

	async getPreviousAndCurrentPeriodTypeAggregates({
		periodLengthInDays,
	}: { periodLengthInDays: number }): Promise<
		Array<{
			period: 'previous' | 'current';
			type: 0 | 1 | 2 | 3;
			total_value: string | number;
		}>
	> {
		const cte = sql`
			SELECT
				${this.getAgeLimitQuery(periodLengthInDays)} AS current_start,
				${this.getAgeLimitQuery(0)} AS current_end,
				${this.getAgeLimitQuery(periodLengthInDays * 2)}  AS previous_start
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
		maxAgeInDays,
		skip = 0,
		take = 20,
		sortBy = 'total:desc',
	}: {
		maxAgeInDays: number;
		skip?: number;
		take?: number;
		sortBy?: string;
	}) {
		const [sortField, sortOrder] = this.parseSortingParams(sortBy);
		const sumOfExecutions = sql`SUM(CASE WHEN insights.type IN (${TypeToNumber.success.toString()}, ${TypeToNumber.failure.toString()}) THEN value ELSE 0 END)`;

		const cte = sql`SELECT ${this.getAgeLimitQuery(maxAgeInDays)} AS start_date`;

		const rawRowsQuery = this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_range')
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
			.innerJoin('date_range', 'date_range', '1=1')
			.where('insights.periodStart >= date_range.start_date')
			.groupBy('metadata.workflowId')
			.addGroupBy('metadata.workflowName')
			.addGroupBy('metadata.projectId')
			.addGroupBy('metadata.projectName')
			.orderBy(this.escapeField(sortField), sortOrder);

		const count = (await rawRowsQuery.getRawMany()).length;
		const rawRows = await rawRowsQuery.offset(skip).limit(take).getRawMany();

		return { count, rows: aggregatedInsightsByWorkflowParser.parse(rawRows) };
	}

	async getInsightsByTime({
		maxAgeInDays,
		periodUnit,
		insightTypes,
	}: { maxAgeInDays: number; periodUnit: PeriodUnit; insightTypes: TypeUnit[] }) {
		const cte = sql`SELECT ${this.getAgeLimitQuery(maxAgeInDays)} AS start_date`;

		const typesAggregation = insightTypes.map((type) => {
			return `SUM(CASE WHEN type = ${TypeToNumber[type]} THEN value ELSE 0 END) AS "${displayTypeName[TypeToNumber[type]]}"`;
		});

		const rawRowsQuery = this.createQueryBuilder()
			.addCommonTableExpression(cte, 'date_range')
			.select([`${this.getPeriodStartExpr(periodUnit)} as "periodStart"`, ...typesAggregation])
			.innerJoin('date_range', 'date_range', '1=1')
			.where(`${this.escapeField('periodStart')} >= date_range.start_date`)
			.groupBy(this.getPeriodStartExpr(periodUnit))
			.orderBy(this.getPeriodStartExpr(periodUnit), 'ASC');

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
}
