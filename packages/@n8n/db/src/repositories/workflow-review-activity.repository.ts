import type {
	WorkflowReviewClosedActivityData,
	WorkflowReviewDecisionActivityData,
	WorkflowReviewOpenedActivityData,
	WorkflowReviewVersionUpdatedActivityData,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewActivityComment } from '../entities/workflow-review-activity-comment.ee';
import { WorkflowReviewActivity } from '../entities/workflow-review-activity.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type WorkflowReviewActivityFeedEntry = {
	activity: WorkflowReviewActivity;
	messages: WorkflowReviewActivityComment[];
};

/**
 * Write-side counterpart of `WorkflowReviewActivityEntry`, reusing its data types so the read
 * and write shapes cannot drift. Repository input only, never serialized, hence not in
 * `@n8n/api-types`. `changes_requested` and `approved` share a member on purpose, so a
 * conditional decision type still typechecks at the call site.
 */
export type WorkflowReviewActivityPayload =
	| { type: 'review.opened'; data: WorkflowReviewOpenedActivityData }
	| { type: 'comment.created' | 'workflow.published'; data: null }
	| {
			type: 'review.changes_requested' | 'review.approved';
			data: WorkflowReviewDecisionActivityData;
	  }
	| { type: 'review.version_updated'; data: WorkflowReviewVersionUpdatedActivityData }
	| { type: 'review.closed'; data: WorkflowReviewClosedActivityData };

@Service()
export class WorkflowReviewActivityRepository extends BaseRepository<WorkflowReviewActivity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewActivity, dataSource.manager, transactionRunner);
	}

	async createActivity(
		input: WorkflowReviewActivityPayload & {
			workflowReviewRequestId: string;
			createdById: string | null;
			/**
			 * Scopes the entry to one workflow; omit for review-level entries. No caller sets it
			 * yet — see the entity, whose FK cascades.
			 */
			workflowId?: string;
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
