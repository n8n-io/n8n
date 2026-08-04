import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithCreatedAt } from './abstract-entity';

/**
 * Body of a `type = 'comment'` activity entry. Exactly the comment entries have a row here,
 * which the schema cannot enforce across two tables: it is an application invariant.
 */
@Entity({ name: 'workflow_review_activity_comment' })
export class WorkflowReviewActivityComment extends WithCreatedAt {
	@PrimaryColumn({ type: 'int' })
	activityId: number;

	/** Only user-editable text in the feed; nulled on delete. */
	@Column({ type: 'text', nullable: true })
	body: string | null;

	/** Intentionally not `@UpdateDateColumn`: stays null until the body is actually edited. */
	@DateTimeColumn({ nullable: true })
	updatedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	deletedAt: Date | null;
}
