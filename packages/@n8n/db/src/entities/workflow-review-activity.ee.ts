import type { WorkflowReviewActivityType } from '@n8n/api-types';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * Altering this table on SQLite recreates it, and `workflow_review_activity_comment` references it
 * with ON DELETE CASCADE, so the rebuild takes the comment rows with it: any later migration
 * touching these columns needs a `sqlite/` subclass with `withFKsDisabled`.
 */
@Entity({ name: 'workflow_review_activity' })
@Index('IDX_workflow_review_activity_request', ['workflowReviewRequestId', 'id'])
export class WorkflowReviewActivity extends WithCreatedAt {
	/**
	 * Autoincrement int, not the usual nanoid: the feed orders by id and pages on it as a cursor.
	 * On SQLite this is a plain rowid alias, so ids are reused once the top rows are deleted, which
	 * deleting a review request does. Never trust a cursor across a deletion; scope reads by
	 * `workflowReviewRequestId`.
	 */
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'varchar', length: 64 })
	type: WorkflowReviewActivityType;

	@Column({ type: 'int', default: 1 })
	typeVersion: number;

	/**
	 * Immutable per-type detail: ids, plus a reviewer's note on a decision. Nothing redacts it —
	 * unlike a comment body, which is nulled on delete, it is frozen once written. No user ids: one
	 * stored here would survive user deletion, unlike `createdById`, so a type needing another actor
	 * gets its own `SET NULL` column.
	 */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;

	/** Who produced this entry. For a comment thread, whoever opened it. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/**
	 * Scopes an entry to one workflow; `null` for review-level entries such as comments and
	 * decisions. Nothing writes it yet, deliberately: the FK is `ON DELETE CASCADE`, so setting it
	 * means accepting that an ordinary workflow delete removes those entries from an append-only
	 * feed, which is why `review.version_updated` keeps its `workflowId` in `data`. Filtering the
	 * feed on this column is the precondition for relaxing
	 * `CreateWorkflowReviewRequestDto.workflows.length(1)`, since a multi-workflow review would
	 * otherwise show entries about workflows the reader may not open.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;
}
