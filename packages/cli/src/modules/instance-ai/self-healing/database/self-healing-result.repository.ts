import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { DataSource, IsNull } from '@n8n/typeorm';

import { SelfHealingResult } from './self-healing-result.entity';

export type CreateSelfHealingResult = Pick<
	SelfHealingResult,
	| 'workflowId'
	| 'projectId'
	| 'backgroundUserId'
	| 'outcome'
	| 'summary'
	| 'report'
	| 'completedAt'
	| 'executionId'
	| 'suggestionId'
	| 'usage'
>;

@Service()
export class SelfHealingResultRepository extends BaseRepository<SelfHealingResult> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SelfHealingResult, dataSource.manager, transactionRunner);
	}

	async getResult(
		id: string,
		scope: Pick<SelfHealingResult, 'workflowId' | 'projectId'>,
		ctx: OperationContext = {},
	) {
		const result = await this.managerFor(ctx).findOneBy(SelfHealingResult, {
			id,
			workflowId: scope.workflowId,
			projectId: scope.projectId,
		});
		if (!result) throw new NotFoundError('Self-healing result not found.');
		return result;
	}

	async createResult(input: CreateSelfHealingResult, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingResult, {
				...input,
				dismissedAt: null,
				dismissedById: null,
			}),
		);
	}

	async dismissResult(id: string, userId: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).update(
			SelfHealingResult,
			{ id, dismissedAt: IsNull() },
			{ dismissedAt: new Date(), dismissedById: userId },
		);
		return result.affected === 1;
	}
}
