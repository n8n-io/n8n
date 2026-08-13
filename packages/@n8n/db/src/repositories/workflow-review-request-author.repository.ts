import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewRequestAuthor } from '../entities/workflow-review-request-author.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowReviewRequestAuthorRepository extends BaseRepository<WorkflowReviewRequestAuthor> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewRequestAuthor, dataSource.manager, transactionRunner);
	}

	async addAuthor(
		input: {
			workflowReviewRequestId: string;
			userId: string;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestAuthor> {
		const entity = this.create({
			workflowReviewRequestId: input.workflowReviewRequestId,
			userId: input.userId,
		});

		return await this.managerFor(ctx).save(WorkflowReviewRequestAuthor, entity);
	}

	/** Idempotent: checks the composite PK explicitly instead of relying on `save` upsert semantics. */
	async addAuthorIfMissing(
		input: {
			workflowReviewRequestId: string;
			userId: string;
		},
		ctx: OperationContext,
	): Promise<void> {
		if (await this.isAuthor(input, ctx)) return;

		await this.addAuthor(input, ctx);
	}

	async isAuthor(
		input: {
			workflowReviewRequestId: string;
			userId: string;
		},
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(WorkflowReviewRequestAuthor, {
			workflowReviewRequestId: input.workflowReviewRequestId,
			userId: input.userId,
		});
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestAuthor[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { userId: 'ASC' },
		});
	}

	async findByRequestIds(requestIds: string[]): Promise<WorkflowReviewRequestAuthor[]> {
		if (requestIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { workflowReviewRequestId: In(requestIds) },
			order: { userId: 'ASC' },
		});
	}
}
