import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithCreatedAt } from './abstract-entity';

/** Feed entry kinds. Plain varchar in the DB; new kinds ship without a migration. */
export type WorkflowReviewActivityType =
	| 'submitted'
	| 'comment'
	| 'changes_requested'
	| 'version_synced'
	| 'approved'
	| 'published';

@Entity({ name: 'workflow_review_activity' })
@Index('IDX_workflow_review_activity_request', ['workflowReviewRequestId', 'id'])
@Index('IDX_workflow_review_activity_group', ['groupId'], { where: '"groupId" IS NOT NULL' })
export class WorkflowReviewActivity extends WithCreatedAt {
	/**
	 * Autoincrement int, not the usual nanoid: the feed orders by id and pages on it as a cursor.
	 * That cursor is only safe while activity rows are never individually hard-deleted (they die
	 * with their review request); on SQLite the id is a rowid alias and can be reused otherwise.
	 */
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'varchar', length: 64 })
	type: WorkflowReviewActivityType;

	@Column({ type: 'int', default: 1 })
	typeVersion: number;

	/** Activity entry this one replies to; null means top-level. */
	@Column({ type: 'int', nullable: true })
	groupId: number | null;

	/** Immutable per-type detail. Ids only: user references belong in `createdById`. */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
