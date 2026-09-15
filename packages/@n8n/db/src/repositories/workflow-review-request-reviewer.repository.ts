import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewRequestReviewer } from '../entities/workflow-review-request-reviewer.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowReviewRequestReviewerRepository extends BaseRepository<WorkflowReviewRequestReviewer> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewRequestReviewer, dataSource.manager, transactionRunner);
	}

	/** Runs in the caller's transaction and only appends rows. */
	async addReviewers(
		input: {
			workflowReviewRequestId: string;
			userIds: string[];
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestReviewer[]> {
		const uniqueUserIds = [...new Set(input.userIds)];
		if (uniqueUserIds.length === 0) {
			return [];
		}

		const entities = uniqueUserIds.map((userId) =>
			this.create({
				workflowReviewRequestId: input.workflowReviewRequestId,
				userId,
			}),
		);

		return await this.managerFor(ctx).save(WorkflowReviewRequestReviewer, entities);
	}

	async isReviewer(
		input: {
			workflowReviewRequestId: string;
			userId: string;
		},
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(WorkflowReviewRequestReviewer, {
			workflowReviewRequestId: input.workflowReviewRequestId,
			userId: input.userId,
		});
	}

	async findByRequestIds(requestIds: string[]): Promise<WorkflowReviewRequestReviewer[]> {
		if (requestIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { workflowReviewRequestId: In(requestIds) },
			order: { userId: 'ASC' },
		});
	}

	/** Of the given requests, the ones this user is assigned to — batched `isReviewer`. */
	async findRequestIdsForUser(requestIds: string[], userId: string): Promise<Set<string>> {
		if (requestIds.length === 0) {
			return new Set();
		}

		const rows = await this.find({
			select: { workflowReviewRequestId: true },
			where: { workflowReviewRequestId: In(requestIds), userId },
		});

		return new Set(rows.map((row) => row.workflowReviewRequestId));
	}
}
