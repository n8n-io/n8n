import {
	type InsightsByTime,
	type InsightsSummary,
	type RestrictedInsightsByTime,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import type { PeriodUnit, TypeUnit, ByTimeInsightType } from './database/entities/insights-shared';
import { NumberToType } from './database/entities/insights-shared';
import type { InsightsAccessFilter } from './database/repositories/insights-by-period.repository';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsCompactionService } from './insights-compaction.service';
import { InsightsPruningService } from './insights-pruning.service';

const BY_TIME_INSIGHT_TYPES: ByTimeInsightType[] = [
	'time_saved_min',
	'runtime_ms',
	'success',
	'failure',
];

type InsightsDateRangeQuery = {
	user: User;
	startDate: Date;
	endDate: Date;
	projectId?: string;
	timeZone?: string;
};

@Service()
export class InsightsService {
	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly compactionService: InsightsCompactionService,
		private readonly pruningService: InsightsPruningService,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly workflowSharingService: WorkflowSharingService,
	) {
		this.logger = this.logger.scoped('insights');
	}

	private async toggleCollectionService(enable: boolean) {
		if (
			this.instanceSettings.instanceType !== 'main' &&
			this.instanceSettings.instanceType !== 'webhook'
		) {
			this.logger.debug('Instance is not main or webhook, skipping collection');
			return;
		}

		const { InsightsCollectionService } = await import('./insights-collection.service.js');
		const collectionService = Container.get(InsightsCollectionService);
		if (enable) {
			collectionService.init();
		} else {
			await collectionService.shutdown();
		}
	}

	async init() {
		await this.toggleCollectionService(true);

		if (this.instanceSettings.isLeader) this.startCompactionAndPruningTimers();
	}

	@OnLeaderTakeover()
	startCompactionAndPruningTimers() {
		this.compactionService.startCompactionTimer();
		this.pruningService.startPruningTimer();
	}

	@OnLeaderStepdown()
	async stopCompactionAndPruningTimers() {
		this.pruningService.stopPruningTimer();
		await this.compactionService.stopCompactionTimer();
	}

	async shutdown() {
		await this.toggleCollectionService(false);
		await this.stopCompactionAndPruningTimers();
	}

	/**
	 * Resolves what insights the caller may read. A requested project must be
	 * readable by them. When no specific project is requested, results are limited to the
	 * workflows they can read.
	 *
	 * Returns the filter to apply, or `undefined` when the caller's global role
	 * already grants access to every workflow.
	 */
	private async resolveAccessFilter(
		user: User,
		projectId?: string,
	): Promise<InsightsAccessFilter | undefined> {
		if (projectId) {
			const userHasRequiredProjectScopes = await userHasScopes(user, ['workflow:read'], false, {
				projectId,
			});
			if (!userHasRequiredProjectScopes) {
				throw new ForbiddenError('You do not have access to insights for this project.');
			}
		}

		const workflowReadRoles = await this.workflowSharingService.rolesGrantingScope(
			user,
			'workflow:read',
		);

		return workflowReadRoles && { user, ...workflowReadRoles };
	}

	async getInsightsSummary({
		user,
		startDate,
		endDate,
		projectId,
		timeZone,
	}: {
		user: User;
		projectId?: string;
		startDate: Date;
		endDate: Date;
		timeZone?: string;
	}): Promise<InsightsSummary> {
		const accessFilter = await this.resolveAccessFilter(user, projectId);

		const rows = await this.insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
			startDate,
			endDate,
			projectId,
			timeZone,
			accessFilter,
		});

		// Initialize data structures for both periods
		const data = {
			current: { byType: {} as Record<TypeUnit, number> },
			previous: { byType: {} as Record<TypeUnit, number> },
		};

		// Organize data by period and type
		rows.forEach((row) => {
			const { period, type, total_value } = row;
			if (!data[period]) return;

			data[period].byType[NumberToType[type]] = total_value ? Number(total_value) : 0;
		});

		// Get values with defaults for missing data
		const getValueByType = (period: 'current' | 'previous', type: TypeUnit) =>
			data[period]?.byType[type] ?? 0;

		// Calculate metrics
		const currentSuccesses = getValueByType('current', 'success');
		const currentFailures = getValueByType('current', 'failure');
		const previousSuccesses = getValueByType('previous', 'success');
		const previousFailures = getValueByType('previous', 'failure');

		const currentTotal = currentSuccesses + currentFailures;
		const previousTotal = previousSuccesses + previousFailures;

		const currentFailureRate =
			currentTotal > 0 ? Math.round((currentFailures / currentTotal) * 1000) / 1000 : 0;
		const previousFailureRate =
			previousTotal > 0 ? Math.round((previousFailures / previousTotal) * 1000) / 1000 : 0;

		const currentTotalRuntime = getValueByType('current', 'runtime_ms') ?? 0;
		const previousTotalRuntime = getValueByType('previous', 'runtime_ms') ?? 0;

		const currentAvgRuntime =
			currentTotal > 0 ? Math.round((currentTotalRuntime / currentTotal) * 100) / 100 : 0;
		const previousAvgRuntime =
			previousTotal > 0 ? Math.round((previousTotalRuntime / previousTotal) * 100) / 100 : 0;

		const currentTimeSaved = getValueByType('current', 'time_saved_min');
		const previousTimeSaved = getValueByType('previous', 'time_saved_min');

		const currentBillable = getValueByType('current', 'billable');
		const previousBillable = getValueByType('previous', 'billable');

		// If the previous period has no executions, we discard deviation
		const getDeviation = (current: number, previous: number) =>
			previousTotal === 0 ? null : current - previous;

		// Return the formatted result
		const result: InsightsSummary = {
			averageRunTime: {
				value: currentAvgRuntime,
				unit: 'millisecond',
				deviation: getDeviation(currentAvgRuntime, previousAvgRuntime),
			},
			failed: {
				value: currentFailures,
				unit: 'count',
				deviation: getDeviation(currentFailures, previousFailures),
			},
			failureRate: {
				value: currentFailureRate,
				unit: 'ratio',
				deviation: getDeviation(currentFailureRate, previousFailureRate),
			},
			timeSaved: {
				value: currentTimeSaved,
				unit: 'minute',
				deviation: getDeviation(currentTimeSaved, previousTimeSaved),
			},
			total: {
				value: currentTotal,
				unit: 'count',
				deviation: getDeviation(currentTotal, previousTotal),
			},
			billable: {
				value: currentBillable,
				unit: 'count',
				deviation: getDeviation(currentBillable, previousBillable),
			},
		};

		return result;
	}

	async getInsightsByWorkflow({
		user,
		skip = 0,
		take = 10,
		sortBy = 'total:desc',
		projectId,
		startDate,
		endDate,
		timeZone,
	}: {
		user: User;
		skip?: number;
		take?: number;
		sortBy?: string;
		projectId?: string;
		startDate: Date;
		endDate: Date;
		timeZone?: string;
	}) {
		const accessFilter = await this.resolveAccessFilter(user, projectId);

		const { count, rows } = await this.insightsByPeriodRepository.getInsightsByWorkflow({
			startDate,
			endDate,
			skip,
			take,
			sortBy,
			projectId,
			timeZone,
			accessFilter,
		});

		// A non-null means the caller can read it; null means the workflow has since been deleted.
		const data = rows.map((row) => ({
			...row,
			hasReadAccess: row.workflowId !== null,
		}));

		return {
			count,
			data,
		};
	}

	async getInsightsByTime({
		user,
		startDate,
		endDate,
		projectId,
		timeZone,
	}: InsightsDateRangeQuery): Promise<InsightsByTime[]> {
		const rows = await this.queryInsightsByTime({
			user,
			startDate,
			endDate,
			projectId,
			timeZone,
			insightTypes: BY_TIME_INSIGHT_TYPES,
		});

		return rows.map((r) => {
			const succeeded = r.succeeded ?? 0;
			const failed = r.failed ?? 0;
			const total = succeeded + failed;
			const runTime = r.runTime ?? 0;

			return {
				date: r.periodStart,
				values: {
					total,
					succeeded,
					failed,
					failureRate: total ? failed / total : 0,
					averageRunTime: total ? runTime / total : 0,
					timeSaved: r.timeSaved ?? 0,
				},
			};
		});
	}

	async getTimeSavedInsightsByTime({
		user,
		startDate,
		endDate,
		projectId,
		timeZone,
	}: InsightsDateRangeQuery): Promise<RestrictedInsightsByTime[]> {
		const rows = await this.queryInsightsByTime({
			user,
			startDate,
			endDate,
			projectId,
			timeZone,
			insightTypes: ['time_saved_min'],
		});

		return rows.map((r) => ({
			date: r.periodStart,
			values: { timeSaved: r.timeSaved ?? 0 },
		}));
	}

	private async queryInsightsByTime({
		user,
		startDate,
		endDate,
		projectId,
		timeZone,
		insightTypes,
	}: InsightsDateRangeQuery & { insightTypes: ByTimeInsightType[] }) {
		const accessFilter = await this.resolveAccessFilter(user, projectId);
		const periodUnit = this.getDateFiltersGranularity({ startDate, endDate });

		return await this.insightsByPeriodRepository.getInsightsByTime({
			periodUnit,
			insightTypes,
			projectId,
			startDate,
			endDate,
			timeZone,
			accessFilter,
		});
	}

	/**
	 * Checks if the selected date range is compliant with the license
	 *
	 * - If the granularity is 'hour', checks if the license allows hourly data access
	 * - Checks if the start date is within the allowed history range
	 *
	 * @throws {UserError} if the license does not allow the selected date range
	 */
	validateDateFiltersLicense({ startDate, endDate }: { startDate: Date; endDate: Date }) {
		// we use `startOf('day')` because the license limits are based on full days
		const today = DateTime.now().startOf('day');
		const startDateStartOfDay = DateTime.fromJSDate(startDate).startOf('day');
		const daysToStartDate = today.diff(startDateStartOfDay, 'days').days;

		const granularity = this.getDateFiltersGranularity({ startDate, endDate });

		const maxHistoryInDays =
			this.licenseState.getInsightsMaxHistory() === -1
				? Number.MAX_SAFE_INTEGER
				: this.licenseState.getInsightsMaxHistory();
		const isHourlyDateLicensed = this.licenseState.isInsightsHourlyDataLicensed();

		if (granularity === 'hour' && !isHourlyDateLicensed) {
			throw new UserError('Hourly data is not available with your current license');
		}

		if (maxHistoryInDays < daysToStartDate) {
			throw new UserError(
				'The selected date range exceeds the maximum history allowed by your license',
			);
		}
	}

	private getDateFiltersGranularity({
		startDate,
		endDate,
	}: { startDate: Date; endDate: Date }): PeriodUnit {
		const startDateTime = DateTime.fromJSDate(startDate);
		const endDateTime = DateTime.fromJSDate(endDate);
		const differenceInDays = endDateTime.diff(startDateTime, 'days').days;

		if (differenceInDays < 1) {
			return 'hour';
		}

		if (differenceInDays <= 30) {
			return 'day';
		}

		return 'week';
	}
}
