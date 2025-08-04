'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.InsightsByPeriodRepository = void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const luxon_1 = require('luxon');
const zod_1 = require('zod');
const insights_by_period_1 = require('../entities/insights-by-period');
const insights_shared_1 = require('../entities/insights-shared');
const dbType = di_1.Container.get(config_1.GlobalConfig).database.type;
const displayTypeName = {
	[insights_shared_1.TypeToNumber.success]: 'succeeded',
	[insights_shared_1.TypeToNumber.failure]: 'failed',
	[insights_shared_1.TypeToNumber.runtime_ms]: 'runTime',
	[insights_shared_1.TypeToNumber.time_saved_min]: 'timeSaved',
};
const summaryParser = zod_1.z
	.object({
		period: zod_1.z.enum(['previous', 'current']),
		type: zod_1.z.union([
			zod_1.z.literal(0),
			zod_1.z.literal(1),
			zod_1.z.literal(2),
			zod_1.z.literal(3),
		]),
		total_value: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
	})
	.array();
const aggregatedInsightsByWorkflowParser = zod_1.z
	.object({
		workflowId: zod_1.z.string(),
		workflowName: zod_1.z.string(),
		projectId: zod_1.z.string(),
		projectName: zod_1.z.string(),
		total: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform((value) => Number(value)),
		succeeded: zod_1.z
			.union([zod_1.z.number(), zod_1.z.string()])
			.transform((value) => Number(value)),
		failed: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform((value) => Number(value)),
		failureRate: zod_1.z
			.union([zod_1.z.number(), zod_1.z.string()])
			.transform((value) => Number(value)),
		runTime: zod_1.z
			.union([zod_1.z.number(), zod_1.z.string()])
			.transform((value) => Number(value)),
		averageRunTime: zod_1.z
			.union([zod_1.z.number(), zod_1.z.string()])
			.transform((value) => Number(value)),
		timeSaved: zod_1.z
			.union([zod_1.z.number(), zod_1.z.string()])
			.transform((value) => Number(value)),
	})
	.array();
const optionalNumberLike = zod_1.z
	.union([zod_1.z.number(), zod_1.z.string()])
	.optional()
	.transform((value) => (value !== undefined ? Number(value) : undefined));
const aggregatedInsightsByTimeParser = zod_1.z
	.object({
		periodStart: zod_1.z.union([zod_1.z.date(), zod_1.z.string()]).transform((value) => {
			if (value instanceof Date) {
				return value.toISOString();
			}
			const parsedDatetime = luxon_1.DateTime.fromSQL(value.toString(), { zone: 'utc' });
			if (parsedDatetime.isValid) {
				return parsedDatetime.toISO();
			}
			return new Date(value).toISOString();
		}),
		runTime: optionalNumberLike,
		succeeded: optionalNumberLike,
		failed: optionalNumberLike,
		timeSaved: optionalNumberLike,
	})
	.array();
let InsightsByPeriodRepository = class InsightsByPeriodRepository extends typeorm_1.Repository {
	constructor(dataSource) {
		super(insights_by_period_1.InsightsByPeriod, dataSource.manager);
		this.isRunningCompaction = false;
	}
	escapeField(fieldName) {
		return this.manager.connection.driver.escape(fieldName);
	}
	getPeriodFilterExpr(maxAgeInDays = 0) {
		let periodStartExpr = `date('now', '-${maxAgeInDays} days')`;
		if (dbType === 'postgresdb') {
			periodStartExpr = `CURRENT_DATE - INTERVAL '${maxAgeInDays} day'`;
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			periodStartExpr = `DATE_SUB(CURRENT_DATE, INTERVAL ${maxAgeInDays} DAY)`;
		}
		return periodStartExpr;
	}
	getPeriodStartExpr(periodUnitToCompactInto) {
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
	getPeriodInsightsBatchQuery({ periodUnitToCompactFrom, compactionBatchSize, maxAgeInDays }) {
		const batchQuery = this.createQueryBuilder()
			.select(
				['id', 'metaId', 'type', 'periodStart', 'value'].map((fieldName) =>
					this.escapeField(fieldName),
				),
			)
			.where(
				`${this.escapeField('periodUnit')} = ${insights_shared_1.PeriodUnitToNumber[periodUnitToCompactFrom]}`,
			)
			.andWhere(`${this.escapeField('periodStart')} < ${this.getPeriodFilterExpr(maxAgeInDays)}`)
			.orderBy(this.escapeField('periodStart'), 'ASC')
			.limit(compactionBatchSize);
		return batchQuery;
	}
	getAggregationQuery(periodUnit) {
		const periodStartExpr = this.getPeriodStartExpr(periodUnit);
		const aggregationQuery = this.manager
			.createQueryBuilder()
			.select(this.escapeField('metaId'))
			.addSelect(this.escapeField('type'))
			.addSelect(insights_shared_1.PeriodUnitToNumber[periodUnit].toString(), 'periodUnit')
			.addSelect(periodStartExpr, 'periodStart')
			.addSelect(`SUM(${this.escapeField('value')})`, 'value')
			.from('rows_to_compact', 'rtc')
			.groupBy(this.escapeField('metaId'))
			.addGroupBy(this.escapeField('type'))
			.addGroupBy(periodStartExpr);
		return aggregationQuery;
	}
	async compactSourceDataIntoInsightPeriod({
		sourceBatchQuery,
		sourceTableName = this.metadata.tableName,
		periodUnitToCompactInto,
	}) {
		if (this.isRunningCompaction) {
			return 0;
		}
		this.isRunningCompaction = true;
		try {
			const getBatchAndStoreInTemporaryTable = (0, db_1.sql)`
				CREATE TEMPORARY TABLE rows_to_compact AS
				${sourceBatchQuery.getSql()};
			`;
			const countBatch = (0, db_1.sql)`
				SELECT COUNT(*) ${this.escapeField('rowsInBatch')} FROM rows_to_compact;
			`;
			const targetColumnNamesStr = ['metaId', 'type', 'periodUnit', 'periodStart']
				.map((param) => this.escapeField(param))
				.join(', ');
			const targetColumnNamesWithValue = `${targetColumnNamesStr}, value`;
			const aggregationQuery = this.getAggregationQuery(periodUnitToCompactInto);
			const insertQueryBase = (0, db_1.sql)`
				INSERT INTO ${this.metadata.tableName}
					(${targetColumnNamesWithValue})
				${aggregationQuery.getSql()}
			`;
			let deduplicateQuery;
			if (dbType === 'mysqldb' || dbType === 'mariadb') {
				deduplicateQuery = (0, db_1.sql)`
				ON DUPLICATE KEY UPDATE value = value + VALUES(value)`;
			} else {
				deduplicateQuery = (0, db_1.sql)`
				ON CONFLICT(${targetColumnNamesStr})
				DO UPDATE SET value = ${this.metadata.tableName}.value + excluded.value
				RETURNING *`;
			}
			const upsertEvents = (0, db_1.sql)`
				${insertQueryBase}
				${deduplicateQuery}
			`;
			const deleteBatch = (0, db_1.sql)`
				DELETE FROM ${sourceTableName}
				WHERE id IN (SELECT id FROM rows_to_compact);
			`;
			const dropTemporaryTable = (0, db_1.sql)`
				DROP TABLE rows_to_compact;
			`;
			const result = await this.manager.transaction(async (trx) => {
				await trx.query(getBatchAndStoreInTemporaryTable);
				await trx.query(upsertEvents);
				const rowsInBatch = await trx.query(countBatch);
				await trx.query(deleteBatch);
				await trx.query(dropTemporaryTable);
				return Number(rowsInBatch[0].rowsInBatch);
			});
			return result;
		} finally {
			this.isRunningCompaction = false;
		}
	}
	getAgeLimitQuery(maxAgeInDays) {
		if (maxAgeInDays === 0) {
			return dbType === 'sqlite' ? "datetime('now')" : 'NOW()';
		}
		return dbType === 'sqlite'
			? `datetime('now', '-${maxAgeInDays} days')`
			: dbType === 'postgresdb'
				? `NOW() - INTERVAL '${maxAgeInDays} days'`
				: `DATE_SUB(NOW(), INTERVAL ${maxAgeInDays} DAY)`;
	}
	async getPreviousAndCurrentPeriodTypeAggregates({ periodLengthInDays }) {
		const cte = (0, db_1.sql)`
			SELECT
				${this.getAgeLimitQuery(periodLengthInDays)} AS current_start,
				${this.getAgeLimitQuery(0)} AS current_end,
				${this.getAgeLimitQuery(periodLengthInDays * 2)}  AS previous_start
		`;
		const rawRows = await this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select(
				(0, db_1.sql)`
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
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			.where('insights.periodStart >= date_ranges.previous_start')
			.andWhere('insights.periodStart <= date_ranges.current_end')
			.groupBy('period')
			.addGroupBy('insights.type')
			.getRawMany();
		return summaryParser.parse(rawRows);
	}
	parseSortingParams(sortBy) {
		const [column, order] = sortBy.split(':');
		return [column, order.toUpperCase()];
	}
	async getInsightsByWorkflow({ maxAgeInDays, skip = 0, take = 20, sortBy = 'total:desc' }) {
		const [sortField, sortOrder] = this.parseSortingParams(sortBy);
		const sumOfExecutions = (0,
		db_1.sql)`SUM(CASE WHEN insights.type IN (${insights_shared_1.TypeToNumber.success.toString()}, ${insights_shared_1.TypeToNumber.failure.toString()}) THEN value ELSE 0 END)`;
		const cte = (0, db_1.sql)`SELECT ${this.getAgeLimitQuery(maxAgeInDays)} AS start_date`;
		const rawRowsQuery = this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_range')
			.select([
				'metadata.workflowId AS "workflowId"',
				'metadata.workflowName AS "workflowName"',
				'metadata.projectId AS "projectId"',
				'metadata.projectName AS "projectName"',
				`SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.success} THEN value ELSE 0 END) AS "${displayTypeName[insights_shared_1.TypeToNumber.success]}"`,
				`SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.failure} THEN value ELSE 0 END) AS "${displayTypeName[insights_shared_1.TypeToNumber.failure]}"`,
				`SUM(CASE WHEN insights.type IN (${insights_shared_1.TypeToNumber.success}, ${insights_shared_1.TypeToNumber.failure}) THEN value ELSE 0 END) AS "total"`,
				(0, db_1.sql)`CASE
								WHEN ${sumOfExecutions} = 0 THEN 0
								ELSE 1.0 * SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.failure.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "failureRate"`,
				`SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.runtime_ms} THEN value ELSE 0 END) AS "${displayTypeName[insights_shared_1.TypeToNumber.runtime_ms]}"`,
				`SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.time_saved_min} THEN value ELSE 0 END) AS "${displayTypeName[insights_shared_1.TypeToNumber.time_saved_min]}"`,
				(0, db_1.sql)`CASE
								WHEN ${sumOfExecutions} = 0	THEN 0
								ELSE 1.0 * SUM(CASE WHEN insights.type = ${insights_shared_1.TypeToNumber.runtime_ms.toString()} THEN value ELSE 0 END) / ${sumOfExecutions}
							END AS "averageRunTime"`,
			])
			.innerJoin('insights.metadata', 'metadata')
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
	async getInsightsByTime({ maxAgeInDays, periodUnit, insightTypes }) {
		const cte = (0, db_1.sql)`SELECT ${this.getAgeLimitQuery(maxAgeInDays)} AS start_date`;
		const typesAggregation = insightTypes.map((type) => {
			return `SUM(CASE WHEN type = ${insights_shared_1.TypeToNumber[type]} THEN value ELSE 0 END) AS "${displayTypeName[insights_shared_1.TypeToNumber[type]]}"`;
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
	async pruneOldData(maxAgeInDays) {
		const thresholdDate = luxon_1.DateTime.now()
			.minus({ days: maxAgeInDays })
			.startOf('day')
			.toJSDate();
		const result = await this.delete({
			periodStart: (0, typeorm_1.LessThanOrEqual)(thresholdDate),
		});
		return { affected: result.affected };
	}
};
exports.InsightsByPeriodRepository = InsightsByPeriodRepository;
exports.InsightsByPeriodRepository = InsightsByPeriodRepository = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [typeorm_1.DataSource])],
	InsightsByPeriodRepository,
);
//# sourceMappingURL=insights-by-period.repository.js.map
