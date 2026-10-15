import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewActivityComment } from '../entities/workflow-review-activity-comment.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowReviewActivityCommentRepository extends BaseRepository<WorkflowReviewActivityComment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewActivityComment, dataSource.manager, transactionRunner);
	}

	async createComment(
		input: {
			activityId: number;
			createdById: string | null;
			body: string;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewActivityComment> {
		const entity = this.create(input);
		return await this.managerFor(ctx).save(WorkflowReviewActivityComment, entity);
	}
}
