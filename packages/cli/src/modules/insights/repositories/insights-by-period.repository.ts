import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { sql } from '@/utils/sql';

import { InsightsByPeriod } from '../entities/insights-by-period';
import type { PeriodUnits } from '../entities/insights-shared';
import { PeriodUnitToNumber } from '../entities/insights-shared';

const dbType = Container.get(GlobalConfig).database.type;

@Service()
export class InsightsByPeriodRepository extends Repository<InsightsByPeriod> {
	constructor(dataSource: DataSource) {
		super(InsightsByPeriod, dataSource.manager);
	}

	private escapeField(fieldName: string) {
		return this.manager.connection.driver.escape(fieldName);
	}

	private getPeriodFilterExpr(periodUnit: PeriodUnits) {
		const daysAgo = periodUnit === 'day' ? 90 : 180;
		// Database-specific period start expression to filter out data to compact by days matching the periodUnit
		let periodStartExpr = `date('now', '-${daysAgo} days')`;
		if (dbType === 'postgresdb') {
			periodStartExpr = `CURRENT_DATE - INTERVAL '${daysAgo} day'`;
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			periodStartExpr = `DATE_SUB(CURRENT_DATE, INTERVAL ${daysAgo} DAY)`;
		}

		return periodStartExpr;
	}

	private getPeriodStartExpr(periodUnit: PeriodUnits) {
		// Database-specific period start expression to truncate timestamp to the periodUnit
		// SQLite by default
		let periodStartExpr = `strftime('%Y-%m-%d ${periodUnit === 'hour' ? '%H' : '00'}:00:00.000', periodStart)`;
		if (dbType === 'mysqldb' || dbType === 'mariadb') {
			periodStartExpr =
				periodUnit === 'hour'
					? "DATE_FORMAT(periodStart, '%Y-%m-%d %H:00:00')"
					: "DATE_FORMAT(periodStart, '%Y-%m-%d 00:00:00')";
		} else if (dbType === 'postgresdb') {
			periodStartExpr = `DATE_TRUNC('${periodUnit}', ${this.escapeField('periodStart')})`;
		}

		return periodStartExpr;
	}

	getPeriodInsightsBatchQuery(periodUnit: PeriodUnits, compactionBatchSize: number) {
		// Build the query to gather period insights data for the batch
		const batchQuery = this.createQueryBuilder()
			.select(
				['id', 'metaId', 'type', 'periodStart', 'value'].map((fieldName) =>
					this.escapeField(fieldName),
				),
			)
			.where(`${this.escapeField('periodUnit')} = ${PeriodUnitToNumber[periodUnit]}`)
			.andWhere(`${this.escapeField('periodStart')} < ${this.getPeriodFilterExpr('day')}`)
			.orderBy(this.escapeField('periodStart'), 'ASC')
			.limit(compactionBatchSize);
		return batchQuery;
	}

	getAggregationQuery(periodUnit: PeriodUnits) {
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

	async compactSourceDataIntoInsightPeriod({
		sourceBatchQuery, // Query to get batch source data. Must return those fields: 'id', 'metaId', 'type', 'periodStart', 'value'
		sourceTableName = this.metadata.tableName, // Repository references for table operations
		periodUnit,
	}: {
		sourceBatchQuery: string;
		sourceTableName?: string;
		periodUnit: PeriodUnits;
	}): Promise<number> {
		// Create temp table that only exists in this transaction for rows to compact
		const getBatchAndStoreInTemporaryTable = sql`
			CREATE TEMPORARY TABLE rows_to_compact AS
			${sourceBatchQuery};
		`;

		const countBatch = sql`
			SELECT COUNT(*) ${this.escapeField('rowsInBatch')} FROM rows_to_compact;
		`;

		const targetColumnNamesStr = ['metaId', 'type', 'periodUnit', 'periodStart']
			.map((param) => this.escapeField(param))
			.join(', ');
		const targetColumnNamesWithValue = `${targetColumnNamesStr}, value`;

		// Function to get the aggregation query
		const aggregationQuery = this.getAggregationQuery(periodUnit);

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
	}
}
