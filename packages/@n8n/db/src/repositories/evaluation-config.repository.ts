import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { EvaluationConfig } from '../entities/evaluation-config.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class EvaluationConfigTable extends BaseRepository<EvaluationConfig> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(EvaluationConfig, dataSource.manager, transactionRunner);
	}
}

@Service()
export class EvaluationConfigRepository {
	private readonly table: EvaluationConfigTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new EvaluationConfigTable(dataSource, transactionRunner);
	}

	async listByWorkflowId(workflowId: string, ctx: OperationContext): Promise<EvaluationConfig[]> {
		return await this.table.managerFor(ctx).find(EvaluationConfig, {
			where: { workflowId },
			order: { createdAt: 'ASC' },
		});
	}

	async findByIdAndWorkflowId(
		id: string,
		workflowId: string,
		ctx: OperationContext,
	): Promise<EvaluationConfig | null> {
		return await this.table
			.managerFor(ctx)
			.findOne(EvaluationConfig, { where: { id, workflowId } });
	}

	async createForWorkflow(
		id: string,
		workflowId: string,
		payload: UpsertEvaluationConfigDto,
		ctx: OperationContext,
	): Promise<EvaluationConfig> {
		const manager = this.table.managerFor(ctx);
		const entity = manager.create(EvaluationConfig, {
			id,
			workflowId,
			status: 'valid',
			invalidReason: null,
			...payload,
		});
		return await manager.save(EvaluationConfig, entity);
	}

	async updateForWorkflow(
		id: string,
		workflowId: string,
		payload: UpsertEvaluationConfigDto,
		ctx: OperationContext,
	): Promise<EvaluationConfig | null> {
		const existing = await this.findByIdAndWorkflowId(id, workflowId, ctx);
		if (!existing) return null;
		Object.assign(existing, payload, { status: 'valid', invalidReason: null });
		return await this.table.managerFor(ctx).save(EvaluationConfig, existing);
	}

	async deleteByIdAndWorkflowId(
		id: string,
		workflowId: string,
		ctx: OperationContext,
	): Promise<number> {
		const result = await this.table.managerFor(ctx).delete(EvaluationConfig, { id, workflowId });
		return result.affected ?? 0;
	}

	async markInvalid(id: string, invalidReason: string, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(EvaluationConfig, { id }, { status: 'invalid', invalidReason });
	}

	async countDistinctWorkflowsWithConfigs(ctx: OperationContext): Promise<number> {
		return await this.table
			.managerFor(ctx)
			.createQueryBuilder(EvaluationConfig, 'evaluation_config')
			.select('evaluation_config.workflowId')
			.distinct(true)
			.getCount();
	}
}
