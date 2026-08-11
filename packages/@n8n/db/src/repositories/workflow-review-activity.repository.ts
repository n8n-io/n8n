import type { WorkflowReviewActivityType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { WorkflowReviewActivityComment } from '../entities/workflow-review-activity-comment.ee';
import { WorkflowReviewActivity } from '../entities/workflow-review-activity.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type WorkflowReviewActivityFeedEntry = {
	activity: WorkflowReviewActivity;
	messages: WorkflowReviewActivityComment[];
};

@Service()
export class WorkflowReviewActivityRepository extends BaseRepository<WorkflowReviewActivity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewActivity, dataSource.manager, transactionRunner);
	}

	async createActivity(
		input: {
			workflowReviewRequestId: string;
			type: WorkflowReviewActivityType;
			data: IDataObject | null;
			createdById: string | null;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewActivity> {
		const entity = this.create(input);
		return await this.managerFor(ctx).save(WorkflowReviewActivity, entity);
	}

	/**
	 * One page of the feed, oldest-first, each thread with its messages attached.
	 * Pages backwards: `beforeId` returns entries older than it.
	 */
	async findFeedPage(
		input: {
			workflowReviewRequestId: string;
			limit: number;
			beforeId?: number;
		},
		ctx: OperationContext,
	): Promise<{ entries: WorkflowReviewActivityFeedEntry[]; hasMore: boolean }> {
		// One row past the page tells us whether an older one exists without a second count.
		const rows = await this.managerFor(ctx).find(WorkflowReviewActivity, {
			where: {
				workflowReviewRequestId: input.workflowReviewRequestId,
				...(input.beforeId !== undefined ? { id: LessThan(input.beforeId) } : {}),
			},
			order: { id: 'DESC' },
			take: input.limit + 1,
		});

		const hasMore = rows.length > input.limit;
		const page = rows.slice(0, input.limit).reverse();

		const messages = await this.findMessagesForActivities(
			page.map((row) => row.id),
			ctx,
		);

		const messagesByActivityId = new Map<number, WorkflowReviewActivityComment[]>();
		for (const message of messages) {
			const thread = messagesByActivityId.get(message.activityId) ?? [];
			thread.push(message);
			messagesByActivityId.set(message.activityId, thread);
		}

		return {
			entries: page.map((activity) => ({
				activity,
				messages: messagesByActivityId.get(activity.id) ?? [],
			})),
			hasMore,
		};
	}

	/**
	 * Scoped only by the ids the caller passes; this table carries no
	 * `workflowReviewRequestId`, so the review scoping comes from `findFeedPage`'s query.
	 *
	 * ponytail: unbounded per thread — the page size bounds threads, not messages. Fine
	 * while a thread holds one message; the replies ticket has to bound it.
	 */
	private async findMessagesForActivities(
		activityIds: number[],
		ctx: OperationContext,
	): Promise<WorkflowReviewActivityComment[]> {
		if (activityIds.length === 0) {
			return [];
		}

		return await this.managerFor(ctx).find(WorkflowReviewActivityComment, {
			where: { activityId: In(activityIds) },
			order: { activityId: 'ASC', id: 'ASC' },
		});
	}
}
