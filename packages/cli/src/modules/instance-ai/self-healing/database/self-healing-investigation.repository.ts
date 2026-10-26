import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, IsNull } from '@n8n/typeorm';

import { SelfHealingInvestigation } from './self-healing-investigation.entity';

@Service()
export class SelfHealingInvestigationRepository extends BaseRepository<SelfHealingInvestigation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SelfHealingInvestigation, dataSource.manager, transactionRunner);
	}

	async findInvestigation(id: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(SelfHealingInvestigation, { id });
	}

	async getUnfinishedForWorkflow(workflowId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOne(SelfHealingInvestigation, {
			where: { workflowId, finishedAt: IsNull() },
			select: { id: true },
		});
	}

	async getUnfinishedThreadIdsForConfiguration(configurationId: number, ctx: OperationContext) {
		const investigations = await this.managerFor(ctx).find(SelfHealingInvestigation, {
			where: { configurationId, finishedAt: IsNull() },
			select: { threadId: true },
		});
		return investigations.map(({ threadId }) => threadId);
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
			configurationId: number;
			executionId: string;
			threadId: string;
			runId: string;
		},
		ctx: OperationContext,
	) {
		const { baseline, ...fields } = input;
		const manager = this.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingInvestigation, {
				...fields,
				workflowId: baseline.workflowId,
				projectId: baseline.projectId,
				backgroundUserId: baseline.backgroundUserId,
				publishedVersionId: baseline.expectedBaseline.publishedVersionId,
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
