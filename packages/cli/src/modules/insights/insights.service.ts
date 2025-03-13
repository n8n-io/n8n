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

const getQuotedIdentifier = (identifier: string) => {
	if (dbType === 'postgresdb') {
		return `"${identifier}"`;
	}
	return `\`${identifier}\``;
};

@Service()
export class InsightsService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsRawRepository: InsightsRawRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
	) {}

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
		await this.compactRawToHour();
	}

	async compactRawToHour() {
		const batchSize = 500;

		const batchedRawInsightsQuery = this.insightsRawRepository
			.createQueryBuilder()
			.select(['id', 'metaId', 'type', 'value', 'timestamp'].map(getQuotedIdentifier))
			.orderBy('timestamp', 'ASC')
			.limit(batchSize);

		// Create temp table that only exists in this transaction for rows to
		// compact.
		const getBatchAndStoreInTemporaryTable = sql`
			CREATE TEMPORARY TABLE rows_to_compact AS
			${batchedRawInsightsQuery.getSql()};
		`;

		const countBatch = sql`
			SELECT COUNT(*) rowsInBatch FROM rows_to_compact;
		`;

		// Database-specific period start expression to truncate timestamp to the hour
		let periodStartExpr = "unixepoch(strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch'))";
		switch (dbType) {
			case 'mysqldb':
			case 'mariadb':
				periodStartExpr = "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')";
				break;
			case 'postgresdb':
				periodStartExpr = "DATE_TRUNC('hour', timestamp)";
				break;
		}

		const insightByPeriodColumnNames = ['metaId', 'type', 'periodUnit', 'periodStart']
			.map(getQuotedIdentifier)
			.join(', ');
		const insightByPeriodColumnNamesWithValue = `${insightByPeriodColumnNames}, value`;

		const aggregateRawInsightsQuery = this.insightsByPeriodRepository.manager
			.createQueryBuilder()
			.select(getQuotedIdentifier('metaId'))
			.addSelect(getQuotedIdentifier('type'))
			.addSelect('0', 'periodUnit')
			.addSelect(periodStartExpr, 'periodStart')
			.addSelect(`SUM(${getQuotedIdentifier('value')})`, 'value')
			.from('rows_to_compact', 'rtc')
			.groupBy(getQuotedIdentifier('metaId'))
			.addGroupBy(getQuotedIdentifier('type'))
			.addGroupBy(periodStartExpr);

		// Insert or update aggregated data
		const insertQueryBase = sql`
			INSERT INTO ${this.insightsByPeriodRepository.metadata.tableName}
				(${insightByPeriodColumnNamesWithValue})
			${aggregateRawInsightsQuery.getSql()}
			`;

		// Database-specific upsert insights by period duplicate key handling
		let upsertEvents: string;
		if (dbType === 'mysqldb' || dbType === 'mariadb') {
			upsertEvents = sql`${insertQueryBase}
				ON DUPLICATE KEY UPDATE value = value + VALUES(value)`;
		} else {
			upsertEvents = sql`${insertQueryBase}
				ON CONFLICT(${insightByPeriodColumnNames})
				DO UPDATE SET value = ${this.insightsByPeriodRepository.metadata.tableName}.value + excluded.value
				RETURNING *`;
		}

		// Delete the processed rows
		const deleteBatch = sql`
			DELETE FROM ${this.insightsRawRepository.metadata.tableName}
			WHERE id IN (SELECT id FROM rows_to_compact);
		`;

		// Clean up
		const dropTemporaryTable = sql`
			DROP TABLE rows_to_compact;
		`;

		// invariant checks
		const valuesSumOfBatch = sql`
			SELECT COALESCE(SUM(value), 0) as sum FROM rows_to_compact
		`;
		const valuesSumOfCompacted = sql`
			SELECT COALESCE(SUM(value), 0) as sum FROM ${this.insightsByPeriodRepository.metadata.tableName}
		`;

		const result = await this.insightsByPeriodRepository.manager.transaction(async (trx) => {
			await trx.query(getBatchAndStoreInTemporaryTable);

			const compactedEvents =
				await trx.query<Array<{ type: InsightsByPeriod['type_']; value: number }>>(upsertEvents);

			// TODO: invariant check is cumbersome and unclear if it adds any value
			//
			//// invariant check
			//const compactedSumBefore = (await trx.query<[{ sum: number }]>(valuesSumOfCompacted))[0].sum;
			//const accumulatedValues = compactedEvents
			//	.map((event) => InsightsByPeriod.fromRaw(event))
			//	.reduce(
			//		(acc, event) => {
			//			acc[event.type] += event.value;
			//			return acc;
			//		},
			//		{ time_saved_min: 0, runtime_ms: 0, success: 0, failure: 0 } as Record<
			//			InsightsByPeriod['type'],
			//			number
			//		>,
			//	);
			//const batchSum = (await trx.query<[{ sum: number }]>(valuesSumOfBatch))[0].sum;
			//const compactedSumAfter = (await trx.query<[{ sum: number }]>(valuesSumOfCompacted))[0].sum;
			//a.equal(compactedSumAfter, batchSum + compactedSumBefore);

			const rowsInBatch =
				await trx.query<[{ rowsInBatch?: number | string; rowsinbatch?: number | string }]>(
					countBatch,
				);

			await trx.query(deleteBatch);
			await trx.query(dropTemporaryTable);

			return Number(rowsInBatch[0].rowsInBatch ?? rowsInBatch[0].rowsinbatch);
		});

		return result;
	}

	async compactHourToDay() {
		const batchSize = 500;

		// Create temp table that only exists in this transaction for rows to
		// compact.
		const batchedInsightsByPeriodQuery = this.insightsByPeriodRepository
			.createQueryBuilder()
			.select(
				['id', 'metaId', 'type', 'periodUnit', 'periodStart', 'value'].map(getQuotedIdentifier),
			)
			.where(`${getQuotedIdentifier('periodUnit')} = 0`)
			.orderBy(getQuotedIdentifier('periodStart'), 'ASC')
			.limit(batchSize);

		// Create temp table that only exists in this transaction for rows to
		// compact.
		const getBatchAndStoreInTemporaryTable = sql`
				CREATE TEMPORARY TABLE rows_to_compact AS
				${batchedInsightsByPeriodQuery.getSql()};
			`;

		const countBatch = sql`
			SELECT COUNT(*) rowsInBatch FROM rows_to_compact;
		`;

		let periodStartExpr = "strftime('%s', periodStart, 'unixepoch', 'start of day')";
		switch (dbType) {
			case 'mysqldb':
			case 'mariadb':
				periodStartExpr = "DATE_FORMAT(periodStart, '%Y-%m-%d 00:00:00')";
				break;
			case 'postgresdb':
				periodStartExpr = 'DATE_TRUNC(\'day\', "periodStart")';
				break;
		}

		const insightByPeriodColumnNames = ['metaId', 'type', 'periodUnit', 'periodStart']
			.map(getQuotedIdentifier)
			.join(', ');
		const insightByPeriodColumnNamesWithValue = `${insightByPeriodColumnNames}, value`;

		const aggregateRawInsightsQuery = this.insightsByPeriodRepository.manager
			.createQueryBuilder()
			.select([getQuotedIdentifier('metaId'), getQuotedIdentifier('type')])
			.addSelect('1', 'periodUnit')
			.addSelect(periodStartExpr, 'periodStart')
			.addSelect(`SUM(${getQuotedIdentifier('value')})`, 'value')
			.from('rows_to_compact', 'rtc')
			.groupBy(getQuotedIdentifier('metaId'))
			.addGroupBy(getQuotedIdentifier('type'))
			.addGroupBy(getQuotedIdentifier('periodStart'));

		// Insert or update aggregated data
		const insertQueryBase = sql`
				INSERT INTO ${this.insightsByPeriodRepository.metadata.tableName} (${insightByPeriodColumnNamesWithValue})
				${aggregateRawInsightsQuery.getSql()}
			`;

		// Database-specific upsert part
		let upsertEvents: string;
		if (dbType === 'mysqldb' || dbType === 'mariadb') {
			upsertEvents = sql`${insertQueryBase}
				ON DUPLICATE KEY UPDATE value = value + VALUES(value)`;
		} else {
			upsertEvents = sql`${insertQueryBase}
				ON CONFLICT(${insightByPeriodColumnNames})
				DO UPDATE SET value = ${this.insightsByPeriodRepository.metadata.tableName}.value + excluded.value
				RETURNING *`;
		}

		console.log(upsertEvents);

		// Delete the processed rows
		const deleteBatch = sql`
					DELETE FROM ${this.insightsByPeriodRepository.metadata.tableName}
					WHERE id IN (SELECT id FROM rows_to_compact);
			`;

		// Clean up
		const dropTemporaryTable = sql`
			DROP TABLE rows_to_compact;
		`;

		const result = await this.insightsByPeriodRepository.manager.transaction(async (trx) => {
			console.log(getBatchAndStoreInTemporaryTable);
			console.log(await trx.query(getBatchAndStoreInTemporaryTable));

			await trx.query<Array<{ type: InsightsByPeriod['type_']; value: number }>>(upsertEvents);

			const rowsInBatch = await trx.query<[{ rowsInBatch: number }]>(countBatch);

			await trx.query(deleteBatch);
			await trx.query(dropTemporaryTable);

			return rowsInBatch[0].rowsInBatch;
		});

		console.log('result', result);
		return result;
	}
}
