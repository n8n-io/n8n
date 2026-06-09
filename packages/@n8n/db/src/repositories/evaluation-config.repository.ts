import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { EvaluationConfig } from '../entities/evaluation-config.ee';

@Service()
export class EvaluationConfigRepository extends Repository<EvaluationConfig> {
	constructor(dataSource: DataSource) {
		super(EvaluationConfig, dataSource.manager);
	}

	async listByWorkflowId(workflowId: string): Promise<EvaluationConfig[]> {
		return await this.find({ where: { workflowId }, order: { createdAt: 'ASC' } });
	}

	async findByIdAndWorkflowId(id: string, workflowId: string): Promise<EvaluationConfig | null> {
		return await this.findOne({ where: { id, workflowId } });
	}

	async createForWorkflow(
		id: string,
		workflowId: string,
		payload: UpsertEvaluationConfigDto,
	): Promise<EvaluationConfig> {
		const entity = this.create({
			id,
			workflowId,
			status: 'valid',
			invalidReason: null,
			...payload,
		});
		return await this.save(entity);
	}

	async updateForWorkflow(
		id: string,
		workflowId: string,
		payload: UpsertEvaluationConfigDto,
	): Promise<EvaluationConfig | null> {
		const existing = await this.findByIdAndWorkflowId(id, workflowId);
		if (!existing) return null;
		Object.assign(existing, payload, { status: 'valid', invalidReason: null });
		return await this.save(existing);
	}

	async deleteByIdAndWorkflowId(id: string, workflowId: string): Promise<number> {
		const result = await this.delete({ id, workflowId });
		return result.affected ?? 0;
	}

	async markInvalid(id: string, invalidReason: string): Promise<void> {
		await this.update({ id }, { status: 'invalid', invalidReason });
	}

	async countDistinctWorkflowsWithConfigs(): Promise<number> {
		return await this.createQueryBuilder('evaluation_config')
			.select('evaluation_config.workflowId')
			.distinct(true)
			.getCount();
	}
}
