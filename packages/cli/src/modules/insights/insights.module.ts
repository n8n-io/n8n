import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import type { InsightsByPeriod } from '@/databases/entities/insights-by-period';
import { InsightsByPeriodRepository } from '@/databases/repositories/insights-by-period.repository';
import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';
import { sql } from '@/utils/sql';

import { InsightsService } from './insights.service';

// NOTE: how to register the routes
//import './insights.controller';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
	) {
		this.logger = this.logger.scoped('insights');
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const insightsService = this.insightsService;

		// Workers should not be saving any insights
		if (this.instanceSettings.instanceType !== 'worker') {
			hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
				await insightsService.workflowExecuteAfterHandler(this, fullRunData);
			});
		}
	}

	// SQLITE_RANGE: column index out of range
	//sql`
	//	BEGIN TRANSACTION;
	//
	//	-- First, select the X oldest rows to compact
	//	WITH rows_to_compact AS (
	//			SELECT id, metaId, type, value, timestamp
	//			FROM analytics_raw
	//			ORDER BY timestamp ASC
	//			LIMIT $1  -- X is the configurable batch size
	//	),
	//	-- Then aggregate them by hour
	//	hourly_aggregates AS (
	//			SELECT
	//					metaId,
	//					type,
	//					0 AS periodUnit, -- 0 represents hourly granularity
	//					strftime('%Y-%m-%d %H:00:00', timestamp) AS periodStart, -- Format timestamp to hour precision
	//					SUM(value) AS value
	//			FROM rows_to_compact
	//			GROUP BY metaId, type, periodStart
	//	)
	//	-- First, insert new records that don't exist yet
	//	INSERT INTO analytics_by_period (metaId, type, periodUnit, periodStart, value)
	//	SELECT ha.metaId, ha.type, ha.periodUnit, ha.periodStart, ha.value
	//	FROM hourly_aggregates ha
	//	WHERE NOT EXISTS (
	//			SELECT 1 FROM analytics_by_period ap
	//			WHERE ap.metaId = ha.metaId
	//			AND ap.type = ha.type
	//			AND ap.periodUnit = ha.periodUnit
	//			AND ap.periodStart = ha.periodStart
	//	);
	//
	//	-- Then update existing records by adding the values
	//	UPDATE analytics_by_period
	//	SET value = value + (
	//			SELECT ha.value
	//			FROM hourly_aggregates ha
	//			WHERE ha.metaId = analytics_by_period.metaId
	//			AND ha.type = analytics_by_period.type
	//			AND ha.periodUnit = analytics_by_period.periodUnit
	//			AND ha.periodStart = analytics_by_period.periodStart
	//	)
	//	WHERE EXISTS (
	//			SELECT 1 FROM hourly_aggregates ha
	//			WHERE ha.metaId = analytics_by_period.metaId
	//			AND ha.type = analytics_by_period.type
	//			AND ha.periodUnit = analytics_by_period.periodUnit
	//			AND ha.periodStart = analytics_by_period.periodStart
	//	);
	//
	//	-- Finally, delete the compacted rows
	//	DELETE FROM analytics_raw
	//	WHERE id IN (SELECT id FROM rows_to_compact);
	//
	//	COMMIT;
	//`,

	// TODO: move query to entities folder so that tests run on all dbs when
	// it's changed
	async compactInsights() {
		await this.compactRawToHour();
	}

	async compactRawToHour() {
		const batchSize = 500;

		// Create temp table that only exists in this transaction for rows to
		// compact.
		const getBatchAndStoreInTemporaryTable = sql`
			CREATE TEMPORARY TABLE rows_to_compact AS
			SELECT id, metaId, type, value, timestamp
			FROM analytics_raw
			ORDER BY timestamp ASC
			LIMIT :limit;
		`;

		const countBatch = sql`
			SELECT COUNT(*) rowsInBatch FROM rows_to_compact;
		`;

		// Insert or update aggregated data
		const upsertEvents = sql`
				INSERT INTO analytics_by_period (metaId, type, periodUnit, periodStart, value)
				SELECT
					metaId,
					type,
					0 AS periodUnit,
				 unixepoch(strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch')) AS periodStart,
					SUM(value) AS value
				FROM rows_to_compact
				GROUP BY metaId, type, periodStart
				ON CONFLICT(metaId, type, periodUnit, periodStart)
				DO UPDATE SET value = value + excluded.value
				RETURNING *;
			`;

		// Delete the processed rows
		const deleteBatch = sql`
					DELETE FROM analytics_raw
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
			SELECT COALESCE(SUM(value), 0) as sum FROM analytics_by_period
		`;

		const result = await this.insightsByPeriodRepository.manager.transaction(async (trx) => {
			await trx.query(getBatchAndStoreInTemporaryTable, [batchSize]);

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

			const rowsInBatch = await trx.query<[{ rowsInBatch: number }]>(countBatch);

			await trx.query(deleteBatch);
			await trx.query(dropTemporaryTable);

			return rowsInBatch[0].rowsInBatch;
		});

		console.log('result', result);
		return result;
	}

	async compactHourToDay() {
		const batchSize = 500;

		// Create temp table that only exists in this transaction for rows to
		// compact.
		const getBatchAndStoreInTemporaryTable = sql`
			CREATE TEMPORARY TABLE rows_to_compact AS
			SELECT id, metaId, type, value, periodUnit, periodStart
			FROM analytics_by_period
			ORDER BY periodStart ASC
			LIMIT :limit;
		`;

		const countBatch = sql`
			SELECT COUNT(*) rowsInBatch FROM rows_to_compact;
		`;

		// Insert or update aggregated data
		const upsertEvents = sql`
				INSERT INTO analytics_by_period (metaId, type, periodUnit, periodStart, value)
				SELECT
					metaId,
					type,
					1 AS periodUnit,
				  strftime('%s', periodStart, 'unixepoch', 'start of day') AS periodStart,
					SUM(value) AS value
				FROM rows_to_compact
				GROUP BY metaId, type, periodStart
				ON CONFLICT(metaId, type, periodUnit, periodStart)
				DO UPDATE SET value = value + excluded.value
				RETURNING *;
			`;

		// Delete the processed rows
		const deleteBatch = sql`
					DELETE FROM analytics_raw
					WHERE id IN (SELECT id FROM rows_to_compact);
			`;

		// Clean up
		const dropTemporaryTable = sql`
					DROP TABLE rows_to_compact;
			`;

		const result = await this.insightsByPeriodRepository.manager.transaction(async (trx) => {
			await trx.query(getBatchAndStoreInTemporaryTable, [batchSize]);

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
