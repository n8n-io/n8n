import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { EvaluationConfig, User, WorkflowEntity } from '@n8n/db';
import { EvaluationConfigRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { nanoid } from 'nanoid';

import { EvaluationConfigValidator } from './evaluation-config-validator';
import { EvaluationApiError } from './evaluation-api-error';

@Service()
export class EvaluationConfigService {
	constructor(
		private readonly repository: EvaluationConfigRepository,
		private readonly validator: EvaluationConfigValidator,
		private readonly licenseState: LicenseState,
	) {}

	async list(workflowId: string): Promise<EvaluationConfig[]> {
		return await this.repository.listByWorkflowId(workflowId);
	}

	async get(workflowId: string, configId: string): Promise<EvaluationConfig | null> {
		return await this.repository.findByIdAndWorkflowId(configId, workflowId);
	}

	async create(
		workflowId: string,
		workflow: WorkflowEntity,
		user: User,
		dto: UpsertEvaluationConfigDto,
	): Promise<EvaluationConfig> {
		// Quota: only enforce on the workflow's *first* config — subsequent configs
		// on the same workflow do not count against the quota (the limit is workflows
		// with at least one evaluation, not total configs).
		const existing = await this.repository.listByWorkflowId(workflowId);
		if (existing.length === 0) {
			const limit = this.licenseState.getMaxWorkflowsWithEvaluations();
			if (limit > 0) {
				const used = await this.repository.countDistinctWorkflowsWithConfigs();
				if (used >= limit) {
					throw new EvaluationApiError(
						'EVALUATION_QUOTA_EXCEEDED',
						`Evaluation quota exceeded: ${used}/${limit} workflows already have evaluations`,
					);
				}
			}
		}

		await this.runValidator(workflow, user, dto);

		return await this.repository.createForWorkflow(nanoid(), workflowId, dto);
	}

	async update(
		workflowId: string,
		configId: string,
		workflow: WorkflowEntity,
		user: User,
		dto: UpsertEvaluationConfigDto,
	): Promise<EvaluationConfig> {
		await this.runValidator(workflow, user, dto);

		const updated = await this.repository.updateForWorkflow(configId, workflowId, dto);
		if (!updated) {
			throw new EvaluationApiError('CONFIG_NOT_FOUND', `Evaluation config "${configId}" not found`);
		}
		return updated;
	}

	async delete(workflowId: string, configId: string): Promise<void> {
		await this.repository.deleteByIdAndWorkflowId(configId, workflowId);
	}

	async markInvalid(configId: string, reason: string): Promise<void> {
		await this.repository.markInvalid(configId, reason);
	}

	private async runValidator(
		workflow: WorkflowEntity,
		user: User,
		dto: UpsertEvaluationConfigDto,
	): Promise<void> {
		const errors = await this.validator.validate({ workflow, config: dto, user });
		if (errors.length > 0) {
			const first = errors[0];
			throw new EvaluationApiError(first.code, first.message, first.details);
		}
	}
}
