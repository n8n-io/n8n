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

/**
 * Altering this table on SQLite recreates it, and `workflow_review_activity_comment` holds an
 * incoming CASCADE FK, so the rebuild takes the comment rows with it: any later migration
 * touching these columns needs a `sqlite/` subclass with `withFKsDisabled`.
 */
@Entity({ name: 'workflow_review_activity' })
@Index('IDX_workflow_review_activity_request', ['workflowReviewRequestId', 'id'])
@Index('IDX_workflow_review_activity_group', ['groupId'], { where: '"groupId" IS NOT NULL' })
export class WorkflowReviewActivity extends WithCreatedAt {
	/**
	 * Autoincrement int, not the usual nanoid: the feed orders by id and pages on it as a cursor.
	 * On SQLite `id` is a plain rowid alias with no AUTOINCREMENT, so ids are reused once the top
	 * rows are deleted — which deleting a review request does. A cursor must therefore never be
	 * trusted across a deletion, and reads must be scoped by `workflowReviewRequestId`.
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

	/**
	 * Immutable per-type detail. Ids only: user references belong in `createdById`, and a type
	 * needing a second actor gets its own `SET NULL` column rather than an id in here — a user id
	 * stored in `data` survives user deletion untouched.
	 */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
