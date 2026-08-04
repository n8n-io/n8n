import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * One message in a comment thread. A `type = 'comment'` activity entry is the thread header and
 * owns one or more of these rows; replies are messages here, not further activity entries. Which
 * activity types own a thread is an application invariant the schema cannot enforce across tables.
 */
@Entity({ name: 'workflow_review_activity_comment' })
@Index('IDX_workflow_review_activity_comment_activity', ['activityId', 'id'])
export class WorkflowReviewActivityComment extends WithCreatedAt {
	/** Autoincrement int: orders the messages within a thread. */
	@PrimaryGeneratedColumn()
	id: number;

	/** Thread this message belongs to; the activity row is its header. */
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
