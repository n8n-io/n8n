import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * Coarse grouping, chosen so a reader can cap and collapse per kind before rendering a feed.
 * Only what is written today — widening is free, since nothing constrains these in the database.
 */
export const activityEventCategories = ['workflow', 'execution', 'eval', 'credential'] as const;

export type ActivityEventCategory = (typeof activityEventCategories)[number];

/**
 * What `resourceId` points at. Absent when an entry is about the instance rather than a resource.
 * An execution entry points at its *workflow*, not the run: that is the thing a reader groups
 * repeated runs under, and the thing a user thinks in terms of. The run id lives in `data`.
 */
export const activityResourceTypes = ['workflow', 'credential'] as const;

export type ActivityResourceType = (typeof activityResourceTypes)[number];

/**
 * Append-only feed of what recently happened on the instance, written from the event bus and read
 * as agent context. Entries are pointers, not payloads: enough to be meaningful in a list, plus the
 * ids needed to fetch the full record on demand.
 */
@Entity({ name: 'activity_event' })
// `id` trails each so a newest-first scan is served by the index alone.
@Index('IDX_activity_event_project', ['projectId', 'id'])
@Index('IDX_activity_event_user', ['userId', 'id'])
// Everything about one resource, for expanding an entry into that resource's own history.
@Index('IDX_activity_event_resource', ['resourceType', 'resourceId', 'id'])
export class ActivityEvent extends WithCreatedAt {
	/**
	 * Autoincrement int, not the usual nanoid: the feed orders by id, pages on it as a cursor, and
	 * records the high-water mark of what a thread was already shown. On SQLite this is a rowid
	 * alias, so ids are reused once the top rows are deleted, which pruning does — never compare a
	 * stored cursor against a feed that has been pruned beneath it.
	 */
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Constrained here and nowhere else. `workflow_review_activity` shipped a CHECK on the
	 * equivalent column and had to drop it again, because a feed's vocabulary grows with every
	 * feature it covers and each widening is another SQLite table recreation. The single writer is
	 * a typed relay, so the compiler already rejects a value outside the union.
	 */
	@Column({ type: 'varchar', length: 32 })
	category: ActivityEventCategory;

	/** The verb: `created`, `saved`, `published`, `failed`, `succeeded`, … Free vocabulary, per above. */
	@Column({ type: 'varchar', length: 64 })
	action: string;

	/** Bumped when the render of an entry's `data` changes, so an old row still reads correctly. */
	@Column({ type: 'int', default: 1 })
	typeVersion: number;

	/** Who did it. Null once that user is deleted, and for entries no user caused (a scheduled run). */
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/**
	 * Deliberately not a foreign key, unlike every other reference in the schema. An entry has to
	 * outlive what it describes — "you deleted the Lead enrichment workflow" is the entry most worth
	 * keeping, and a CASCADE would erase it at exactly the moment it became interesting. The same
	 * mistake was made and undone on `workflow_review_activity.workflowId`. Reads therefore treat
	 * every pointer as possibly dangling, and expanding a deleted resource is an expected outcome.
	 */
	@Column({ type: 'varchar', length: 32, nullable: true })
	resourceType: ActivityResourceType | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	resourceId: string | null;

	/**
	 * Denormalised so an entry reads without a join — and so it survives the resource's deletion,
	 * which is the only remaining record of what the thing was called. Truncated on write.
	 */
	@Column({ type: 'text', nullable: true })
	resourceName: string | null;

	/**
	 * The little that makes an entry meaningful unexpanded: a run's status and failing node, a
	 * save's node delta. Size-capped on write. No user ids — one stored here would outlive the user
	 * deletion that nulls `userId`.
	 */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;
}
