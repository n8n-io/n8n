import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import { InsightsByPeriodRepository } from '@/databases/repositories/insights-by-period.repository';
import { InsightsRawRepository } from '@/databases/repositories/insights-raw.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { InsightsMetadata } from '@/modules/insights/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/entities/insights-raw';

const shouldSkipStatus: Record<ExecutionStatus, boolean> = {
	success: false,
	crashed: false,
	error: false,

	canceled: true,
	new: true,
	running: true,
	unknown: true,
	waiting: true,
};

const shouldSkipMode: Record<WorkflowExecuteMode, boolean> = {
	cli: false,
	error: false,
	integrated: false,
	retry: false,
	trigger: false,
	webhook: false,
	evaluation: false,

	internal: true,
	manual: true,
};

@Service()
export class InsightsService {
	private readonly rawToHourBatchSize = 500;

	private readonly hourToDayBatchSize = 500;

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
	) {
		setInterval(async () => await this.compactInsights(), 1000 * 60);
	}

	async workflowExecuteAfterHandler(ctx: ExecutionLifecycleHooks, fullRunData: IRun) {
		if (shouldSkipStatus[fullRunData.status] || shouldSkipMode[fullRunData.mode]) {
			return;
		}

		const status = fullRunData.status === 'success' ? 'success' : 'failure';

		await this.sharedWorkflowRepository.manager.transaction(async (trx) => {
			const sharedWorkflow = await trx.findOne(SharedWorkflow, {
				where: { workflowId: ctx.workflowData.id, role: 'workflow:owner' },
				relations: { project: true },
			});

			if (!sharedWorkflow) {
				throw new UnexpectedError(
					`Could not find an owner for the workflow with the name '${ctx.workflowData.name}' and the id '${ctx.workflowData.id}'`,
				);
			}

			await trx.upsert(
				InsightsMetadata,
				{
					workflowId: ctx.workflowData.id,
					workflowName: ctx.workflowData.name,
					projectId: sharedWorkflow.projectId,
					projectName: sharedWorkflow.project.name,
				},
				['workflowId'],
			);
			const metadata = await trx.findOneBy(InsightsMetadata, {
				workflowId: ctx.workflowData.id,
			});

			if (!metadata) {
				// This can't happen, we just wrote the metadata in the same
				// transaction.
				throw new UnexpectedError(
					`Could not find metadata for the workflow with the id '${ctx.workflowData.id}'`,
				);
			}

			// success or failure event
			{
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = status;
				event.value = 1;
				await trx.insert(InsightsRaw, event);
			}

			// run time event
			if (fullRunData.stoppedAt) {
				const value = fullRunData.stoppedAt.getTime() - fullRunData.startedAt.getTime();
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = 'runtime_ms';
				event.value = value;
				await trx.insert(InsightsRaw, event);
			}

			// time saved event
			if (status === 'success' && ctx.workflowData.settings?.timeSavedPerExecution) {
				const event = new InsightsRaw();
				event.metaId = metadata.metaId;
				event.type = 'time_saved_min';
				event.value = ctx.workflowData.settings.timeSavedPerExecution;
				await trx.insert(InsightsRaw, event);
			}
		});
	}

	async compactInsights() {
		let numberOfCompactedData: number;

		do {
			numberOfCompactedData = await this.compactRawToHour();
		} while (numberOfCompactedData > 0);
	}

	private escapeField(fieldName: string) {
		return this.insightsByPeriodRepository.manager.connection.driver.escape(fieldName);
	}

	/**
	 * Compacts raw data to hourly aggregates
	 */
	async compactRawToHour() {
		// Get the query builder function for raw insights
		const batchQuery = this.insightsRawRepository
			.createQueryBuilder()
			.select(['id', 'metaId', 'type', 'value'].map((fieldName) => this.escapeField(fieldName)))
			.addSelect('timestamp', 'periodStart')
			.orderBy('timestamp', 'ASC')
			.limit(this.rawToHourBatchSize);

		return await this.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery.getSql(),
			sourceTableName: this.insightsRawRepository.metadata.tableName,
			periodUnit: 'hour',
		});
	}

	/**
	 * Compacts hourly data to daily aggregates
	 */
	async compactHourToDay() {
		// Get the query builder function for hourly insights
		const batchQuery = this.insightsByPeriodRepository
			.createQueryBuilder()
			.select(
				['id', 'metaId', 'type', 'periodStart', 'value'].map((fieldName) =>
					this.escapeField(fieldName),
				),
			)
			.where(`${this.escapeField('periodUnit')} = 0`)
			.orderBy(this.escapeField('periodStart'), 'ASC')
			.limit(this.hourToDayBatchSize);

		return await this.compactSourceDataIntoInsightPeriod({
			sourceBatchQuery: batchQuery.getSql(),
			periodUnit: 'day',
		});
	}

	private getPeriodStartExpr(periodUnit: PeriodUnits) {
		// Database-specific period start expression to truncate timestamp to the periodUnit
		// SQLite by default
		let periodStartExpr = `unixepoch(strftime('%Y-%m-%d ${periodUnit === 'hour' ? '%H' : '00'}:00:00', periodStart, 'unixepoch'))`;
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

	async compactSourceDataIntoInsightPeriod({
		sourceBatchQuery, // Query to get batch source data. Must return those fields: 'id', 'metaId', 'type', 'periodStart', 'value'
		sourceTableName = this.insightsByPeriodRepository.metadata.tableName, // Repository references for table operations
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

		const periodStartExpr = this.getPeriodStartExpr(periodUnit);

		// Function to get the aggregation query
		const aggregationQuery = this.insightsByPeriodRepository.manager
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

		// Insert or update aggregated data
		const insertQueryBase = sql`
			INSERT INTO ${this.insightsByPeriodRepository.metadata.tableName}
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
				DO UPDATE SET value = ${this.insightsByPeriodRepository.metadata.tableName}.value + excluded.value
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

		const result = await this.insightsByPeriodRepository.manager.transaction(async (trx) => {
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
