import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * One message in a comment thread. A `type = 'comment'` activity entry is the thread header and
 * owns one or more of these rows; replies are messages here, not further activity entries. Which
 * activity types own a thread is an application invariant the schema cannot enforce across tables.
 *
 * Nothing enforces the "one or more" either, and a header with zero messages cannot be rendered —
 * it has no `body`, and no `deletedAt` of its own to hide it — so creating a thread and its first
 * message must be a single transaction.
 */
@Entity({ name: 'workflow_review_activity_comment' })
@Index('IDX_workflow_review_activity_comment_activity', ['activityId', 'id'])
export class WorkflowReviewActivityComment extends WithCreatedAt {
	/**
	 * Autoincrement int: orders the messages within a thread. On SQLite this is a plain rowid alias
	 * with no AUTOINCREMENT, so ids are reused once the top rows are deleted — which deleting a
	 * thread or its review request does. Never trust a cursor across a deletion, and scope reads by
	 * `activityId`.
	 */
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Thread this message belongs to; the activity row is its header. This table deliberately
	 * carries no `workflowReviewRequestId`, so a by-id mutation must authorise by joining
	 * comment -> activity -> request -> project. `id` is a globally sequential int and enumerable
	 * across projects, so that join is the only thing between a guessed id and another project's
	 * review.
	 */
	@Column({ type: 'int' })
	activityId: number;

	/** Author of this message. The header's `createdById` only covers whoever opened the thread. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/** Only user-editable text in the feed; nulled on delete. */
	@Column({ type: 'text', nullable: true })
	body: string | null;

	/** Reserved for revision history. Cleared alongside `body` on delete, or the tombstone leaks. */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;

	/** Intentionally not `@UpdateDateColumn`: stays null until the body is actually edited. */
	@DateTimeColumn({ nullable: true })
	updatedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	deletedAt: Date | null;
}
