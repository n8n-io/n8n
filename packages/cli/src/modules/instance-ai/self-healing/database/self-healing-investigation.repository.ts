import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource, IsNull } from '@n8n/typeorm';

import { SelfHealingInvestigation } from './self-healing-investigation.entity';

@Service()
export class SelfHealingInvestigationRepository extends BaseRepository<SelfHealingInvestigation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SelfHealingInvestigation, dataSource.manager, transactionRunner);
	}

	async get(id: string, ctx: OperationContext = {}) {
		const investigation = await this.managerFor(ctx).findOneBy(SelfHealingInvestigation, { id });
		if (!investigation) throw new NotFoundError('Self-healing investigation not found.');
		return investigation;
	}

	async getUnfinishedForWorkflow(workflowId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOne(SelfHealingInvestigation, {
			where: { workflowId, finishedAt: IsNull() },
			select: { id: true },
		});
	}

	async getForExecution(workflowId: string, executionId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOne(SelfHealingInvestigation, {
			where: { workflowId, executionId },
			select: { id: true },
		});
	}

	async createInvestigation(
		input: {
			baseline: WorkflowSuggestionBaseline;
			executionId: string;
			threadId: string;
			runId: string;
		},
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingInvestigation, {
				...input,
				workflowId: input.baseline.workflowId,
				projectId: input.baseline.projectId,
				backgroundUserId: input.baseline.backgroundUserId,
				resultId: null,
				finishedAt: null,
			}),
		);
	}

	async finishWithoutResult(id: string, ctx: OperationContext = {}) {
		await this.managerFor(ctx).update(
			SelfHealingInvestigation,
			{ id, finishedAt: IsNull() },
			{ finishedAt: new Date() },
		);
	}

	async completeWithResult(id: string, resultId: string, ctx: OperationContext) {
		const updated = await this.managerFor(ctx).update(
			SelfHealingInvestigation,
			{ id, finishedAt: IsNull(), resultId: IsNull() },
			{ resultId, finishedAt: new Date() },
		);
		if (updated.affected !== 1) {
			throw new ConflictError('The self-healing investigation has already finished.');
		}
	}

	async listUnfinished() {
		return await this.managerFor({}).find(SelfHealingInvestigation, {
			where: { finishedAt: IsNull() },
		});
	}
}
