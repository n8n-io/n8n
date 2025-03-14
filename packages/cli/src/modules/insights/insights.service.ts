import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';
import { z } from 'zod';

import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { InsightsMetadata } from '@/modules/insights/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/entities/insights-raw';
import { sql } from '@/utils/sql';

import type { TypeUnits } from './entities/insights-shared';
import { NumberToType } from './entities/insights-shared';
import { InsightsByPeriodRepository } from './repositories/insights-by-period.repository';

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

const parser = z
	.object({
		period: z.enum(['previous', 'current']),
		// TODO: extract to abstract-entity
		type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
		// TODO: improve, it's either or
		total_value: z.union([
			z.string().transform((value) => Number.parseInt(value)),
			z.number().nullable(),
		]),
		avg_runtime: z.union([
			z.number().nullable(),
			z.string().transform((value) => Number.parseFloat(value)),
		]),
	})
	.array();

@Service()
export class InsightsService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly globalConfig: GlobalConfig,
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

	// TODO: add return type once rebased on master and InsightsSummary is
	// available
	async getInsightsSummary(): Promise<any> {
		const dbType = this.globalConfig.database.type;
		const cte =
			dbType === 'sqlite'
				? sql`
				SELECT
					strftime('%s', date('now', '-7 days')) AS current_start,
					strftime('%s', date('now')) AS current_end,
					strftime('%s', date('now', '-14 days')) AS previous_start
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

		const rawRows = await this.insightsByPeriodRepository
			.createQueryBuilder('insights')
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
			.addSelect('SUM(CASE WHEN type = 1 THEN NULL ELSE value END)', 'total_value')
			.addSelect(
				'AVG(CASE WHEN insights.type = 1 THEN insights.value ELSE NULL END)',
				'avg_runtime',
			)
			// Use a cross join with the CTE
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			// Filter to only include data from the last 14 days
			.where('insights.periodStart >= date_ranges.previous_start')
			.andWhere('insights.periodStart <= date_ranges.current_end')
			// Group by both period and type
			.groupBy('period')
			.addGroupBy('insights.type')
			.getRawMany();

		const rows = parser.parse(rawRows);

		// Initialize data structures for both periods
		const data = {
			current: { byType: {} as Record<TypeUnits, number> },
			previous: { byType: {} as Record<TypeUnits, number> },
		};

		// Organize data by period and type
		rows.forEach((row) => {
			const { period, type, total_value, avg_runtime } = row;
			if (!data[period]) return;

			data[period].byType[NumberToType[type]] = (total_value ? total_value : avg_runtime) ?? 0;
		});

		// Get values with defaults for missing data
		const getValueByType = (period: 'current' | 'previous', type: TypeUnits) =>
			data[period]?.byType[type] ?? 0;

		// Calculate metrics
		const currentSuccesses = getValueByType('current', 'success');
		const currentFailures = getValueByType('current', 'failure');
		const previousSuccesses = getValueByType('previous', 'success');
		const previousFailures = getValueByType('previous', 'failure');

		const currentTotal = currentSuccesses + currentFailures;
		const previousTotal = previousSuccesses + previousFailures;

		const currentFailureRate = currentTotal > 0 ? currentFailures / currentTotal : 0;
		const previousFailureRate = previousTotal > 0 ? previousFailures / previousTotal : 0;

		const currentAvgRuntime = getValueByType('current', 'runtime_ms') ?? 0;
		const previousAvgRuntime = getValueByType('previous', 'runtime_ms') ?? 0;

		const currentTimeSaved = getValueByType('current', 'time_saved_min');
		const previousTimeSaved = getValueByType('previous', 'time_saved_min');

		// Return the formatted result
		const result = {
			averageRunTime: {
				value: currentAvgRuntime,
				unit: 'time',
				deviation: currentAvgRuntime - previousAvgRuntime,
			},
			failed: {
				value: currentFailures,
				unit: 'count',
				deviation: currentFailures - previousFailures,
			},
			failureRate: {
				value: currentFailureRate,
				unit: 'ratio',
				deviation: currentFailureRate - previousFailureRate,
			},
			timeSaved: {
				value: currentTimeSaved,
				unit: 'time',
				deviation: currentTimeSaved - previousTimeSaved,
			},
			total: {
				value: currentTotal,
				unit: 'count',
				deviation: currentTotal - previousTotal,
			},
		};

		return result;
	}
}
