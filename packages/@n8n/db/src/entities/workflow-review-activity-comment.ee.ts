import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * One message in a comment thread. A `type = 'comment.created'` activity entry is the thread header,
 * owning these rows; replies are messages here, not further activity entries. A header with no messages
 * cannot be rendered, having no `body` of its own, so create a thread and its first message in one
 * transaction.
 */
@Entity({ name: 'workflow_review_activity_comment' })
@Index('IDX_workflow_review_activity_comment_activity', ['activityId', 'id'])
export class WorkflowReviewActivityComment extends WithCreatedAt {
	/**
	 * Orders the messages within a thread. Same SQLite id-reuse caveat as
	 * `WorkflowReviewActivity.id`, scoped by `activityId`.
	 */
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Thread this message belongs to. This table carries no `workflowReviewRequestId`, and `id` is
	 * globally sequential and enumerable across projects, so a by-id mutation must authorise by
	 * joining comment -> activity -> request -> project.
	 */
	@Column({ type: 'int' })
	activityId: number;

	/** Author of this message. The header's `createdById` only covers whoever opened the thread. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/** Only user-editable text in the feed; nulled on delete. */
	@Column({ type: 'text', nullable: true })
	body: string | null;

	@JsonColumn({ nullable: true })
	history: IDataObject[] | null;

	/** Intentionally not `@UpdateDateColumn`: stays null until the body is actually edited. */
	@DateTimeColumn({ nullable: true })
	updatedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	deletedAt: Date | null;
}
