import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { ExecutionQuotaPeriodUnit } from '@n8n/db';
import {
	ProjectExecutionCounterRepository,
	ProjectExecutionQuotaRepository,
	ProjectRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { License } from '@/license';
import { InsightsByPeriodRepository } from '@/modules/insights/database/repositories/insights-by-period.repository';
import { shouldSkipMode } from '@/modules/insights/insights-collection.service';

import { computePeriodBucket, computePeriodEnd } from './period-bucket';
import { ProjectExecutionQuotaExceededError } from './project-execution-quota.error';
import { resolveDefaultProjectExecutionLimit } from './project-execution-quota.helper';

@Service()
export class ProjectExecutionQuotaService {
	private static readonly SPIKE_MULTIPLIER = 5;

	/** Trailing window, in days, that the spike-guard baseline is averaged over. */
	private static readonly BASELINE_WINDOW_DAYS = 7;

	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly quotaRepository: ProjectExecutionQuotaRepository,
		private readonly counterRepository: ProjectExecutionCounterRepository,
		private readonly license: License,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	async resolveLimit(
		projectId: string,
	): Promise<{ limit: number; periodUnit: ExecutionQuotaPeriodUnit }> {
		const override = await this.quotaRepository.findOneBy({ projectId });
		if (override) return { limit: override.limit, periodUnit: override.periodUnit };

		return {
			limit: resolveDefaultProjectExecutionLimit(this.license),
			periodUnit: 'day',
		};
	}

	async setLimit(projectId: string, limit: number, periodUnit: ExecutionQuotaPeriodUnit) {
		await this.quotaRepository.upsert({ projectId, limit, periodUnit }, ['projectId']);
	}

	async getConsumption(projectId: string) {
		const { limit, periodUnit } = await this.resolveLimit(projectId);
		const now = DateTime.utc();
		const periodStart = computePeriodBucket(periodUnit, now);
		const consumed = await this.counterRepository.getProjectPeriodTotal(
			projectId,
			periodUnit,
			periodStart,
		);

		return {
			limit,
			periodUnit,
			consumed,
			remaining: limit === UNLIMITED_LICENSE_QUOTA ? null : Math.max(limit - consumed, 0),
			resetsAt: computePeriodEnd(periodUnit, now).toISO(),
		};
	}

	/**
	 * Every project in the instance with its resolved quota and current
	 * consumption — the data source for the instance-admin cross-project
	 * view. A loop over `getConsumption` is the right shape at realistic
	 * self-hosted instance scale (see spec addendum); a single aggregate
	 * query is a later optimization, not required here.
	 */
	async getAllProjectsConsumption() {
		const projects = await this.projectRepository.find();

		return await Promise.all(
			projects.map(async (project) => ({
				projectId: project.id,
				projectName: project.name,
				...(await this.getConsumption(project.id)),
			})),
		);
	}

	/**
	 * Called from `ActiveExecutions.add()` before an execution is persisted.
	 * Throws `ProjectExecutionQuotaExceededError` and does not increment the
	 * counter if the project is already at or over quota. Modes Insights
	 * itself never counts (manual, agent, integrated, internal, chat) skip
	 * the check entirely, matching `shouldSkipMode` in insights-collection —
	 * see the spec's "Consistency with Insights" section for the one
	 * documented gap this does not close (status is unknown at this point).
	 */
	async assertWithinQuotaAndIncrement(
		workflowId: string,
		mode: WorkflowExecuteMode,
	): Promise<void> {
		if (shouldSkipMode[mode]) return;

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) return;

		const { limit, periodUnit } = await this.resolveLimit(project.id);
		const periodStart = computePeriodBucket(periodUnit, DateTime.utc());

		if (limit !== UNLIMITED_LICENSE_QUOTA) {
			const consumed = await this.counterRepository.getProjectPeriodTotal(
				project.id,
				periodUnit,
				periodStart,
			);

			if (consumed >= limit) {
				throw new ProjectExecutionQuotaExceededError(limit, periodUnit);
			}
		}

		await this.counterRepository.incrementWorkflowCount(
			project.id,
			workflowId,
			periodUnit,
			periodStart,
		);

		// Spike-guard stopgap: `getSpikes` always reads the `'day'`-unit bucket
		// (see below), but the increment above only writes the project's
		// *configured* `periodUnit` bucket. For a week/month-period project
		// that means no `'day'` rows are ever created, so the spike-guard
		// silently has nothing to read. Also increment a `'day'` bucket here so
		// spike detection keeps working regardless of the enforcement period —
		// guarded so a day-period project (where the two buckets are the same
		// row) doesn't get double-counted.
		if (periodUnit !== 'day') {
			const dayBucket = computePeriodBucket('day', DateTime.utc());
			await this.counterRepository.incrementWorkflowCount(project.id, workflowId, 'day', dayBucket);
		}
	}

	/**
	 * Flag-only: workflows whose executions today exceed SPIKE_MULTIPLIER
	 * times their own trailing 7-day daily average. Never gates execution —
	 * see spec "Spike-Guard (flag only)".
	 */
	async getSpikes(projectId: string) {
		const today = computePeriodBucket('day', DateTime.utc());
		const todaysCounts = await this.counterRepository.findByProjectId(projectId, 'day', today);

		const spikes = [];
		for (const { workflowId, count } of todaysCounts) {
			const since = DateTime.utc().minus({ days: 7 }).startOf('day').toJSDate();
			const hourlyRows = await this.insightsByPeriodRepository.getTrailingHourlyRows(
				workflowId,
				since,
			);

			const byDay = new Map<string, number>();
			for (const row of hourlyRows) {
				// `zone: 'utc'` matters: `today` is a UTC day-key (from
				// `computePeriodBucket('day', DateTime.utc())`), but
				// `fromJSDate` without an explicit zone uses Luxon's
				// system/local zone. On a non-UTC server the day-keys would
				// drift apart, so `byDay.delete(today)` below would silently
				// fail to strip today's own rows out of the baseline.
				const day = DateTime.fromJSDate(row.periodStart, { zone: 'utc' }).toFormat('yyyy-MM-dd');
				byDay.set(day, (byDay.get(day) ?? 0) + row.value);
			}
			byDay.delete(today);

			// Fixed 7-day denominator (zero-filling days with no data), per the
			// spec: "summed per calendar day and averaged over the trailing 7
			// days, excluding today." Averaging only over days that had
			// activity (dividing by the number of populated days instead of a
			// fixed 7) would inflate the baseline for a workflow that's only
			// sporadically active, making it *harder* to flag a burst from a
			// bursty/sparse workflow — the opposite of the intended effect.
			const totalTrailingCount = [...byDay.values()].reduce((sum, value) => sum + value, 0);
			const baseline = totalTrailingCount / ProjectExecutionQuotaService.BASELINE_WINDOW_DAYS;
			if (baseline > 0 && count > baseline * ProjectExecutionQuotaService.SPIKE_MULTIPLIER) {
				spikes.push({
					workflowId,
					todayCount: count,
					baseline,
					multiplier: ProjectExecutionQuotaService.SPIKE_MULTIPLIER,
				});
			}
		}

		return spikes;
	}
}
