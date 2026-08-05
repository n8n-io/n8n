import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewActivityComment } from '../entities/workflow-review-activity-comment.ee';
import { WorkflowReviewActivity } from '../entities/workflow-review-activity.ee';
import type { OperationContext } from '../services/transaction';

@Service()
export class WorkflowReviewActivityCommentRepository extends BaseRepository<WorkflowReviewActivityComment> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewActivityComment, dataSource.manager);
	}

	/**
	 * Messages of the given threads, scoped to one review through an inner join on the
	 * activity header: this table carries no `workflowReviewRequestId` and its ids are
	 * globally enumerable, so every access authorises through the header.
	 *
	 * Unbounded per thread — the page size bounds threads, not messages. Fine while a thread
	 * holds exactly one message; the replies ticket has to bound it.
	 */
	async findManyByActivityIds(
		input: {
			workflowReviewRequestId: string;
			activityIds: number[];
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewActivityComment[]> {
		if (input.activityIds.length === 0) {
			return [];
		}

		return await this.managerFor(ctx)
			.createQueryBuilder(WorkflowReviewActivityComment, 'comment')
			// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
			.innerJoin(WorkflowReviewActivity, 'activity', 'activity.id = comment.activityId')
			.where('comment.activityId IN (:...activityIds)', { activityIds: input.activityIds })
			.andWhere('activity.workflowReviewRequestId = :workflowReviewRequestId', {
				workflowReviewRequestId: input.workflowReviewRequestId,
			})
			.orderBy('comment.activityId', 'ASC')
			.addOrderBy('comment.id', 'ASC')
			.getMany();
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
