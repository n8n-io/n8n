import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { ExecutionQuotaPeriodUnit } from '@n8n/db';
import {
	ProjectExecutionCounterRepository,
	ProjectExecutionQuotaRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { License } from '@/license';
import { shouldSkipMode } from '@/modules/insights/insights-collection.service';

import { computePeriodBucket } from './period-bucket';
import { ProjectExecutionQuotaExceededError } from './project-execution-quota.error';
import { resolveDefaultProjectExecutionLimit } from './project-execution-quota.helper';

@Service()
export class ProjectExecutionQuotaService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly quotaRepository: ProjectExecutionQuotaRepository,
		private readonly counterRepository: ProjectExecutionCounterRepository,
		private readonly license: License,
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
		const periodStart = computePeriodBucket(periodUnit, DateTime.utc());
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
		};
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
	}
}
