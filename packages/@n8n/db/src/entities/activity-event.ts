import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithCreatedAt } from './abstract-entity';

/**
 * What kind of thing happened — distinct from `resourceType`, which is what the entry *points at*.
 * The unit a reader caps and collapses per kind by, and half the key (with `action`) that
 * `typeVersion` versions the shape of `data` against.
 *
 * Executions are deliberately absent. `execution_entity` already holds every run and indexes
 * `(workflowId, status, id)` for exactly the read a feed wants, so a row per run would duplicate
 * an existing row at the same cardinality — and pay for it with an insert on the execution hot
 * path, on every worker. A reader queries that table instead.
 *
 * Only what is written today — widening is free, since nothing constrains these in the database.
 */
export const activityEventCategories = ['workflow', 'credential'] as const;

export type ActivityEventCategory = (typeof activityEventCategories)[number];

/**
 * What `resourceId` points at — the pointer's type, not the entry's kind; see `category`.
 * Null when an entry is about the instance rather than a resource.
 *
 * Every entry written today has `resourceType === category`, so the column is currently derivable.
 * It stays because the two come apart as soon as an entry is about one kind of thing but points at
 * another: a source-control pull is the next such case. Adding it back later costs a migration.
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
export class ActivityEvent extends WithCreatedAt {
	/**
	 * Autoincrement int, not the usual nanoid: the feed orders by id and pages on it.
	 *
	 * It is an ordering key, **not** a completeness watermark. Postgres allocates a sequence value
	 * outside the surrounding transaction, so two concurrent writers can commit id 101 before id
	 * 100. A reader that stores the highest id it has seen and asks for "everything above it" will
	 * skip 100 forever. Any tailing read has to tolerate gaps — re-scan a lag window, or track
	 * seen ids — rather than trust a single high-water mark.
	 *
	 * On SQLite this is a rowid alias: pruning deletes the oldest rows and so never frees the
	 * highest id, but emptying the table does, and ids then restart.
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

	/** The verb: `created`, `saved`, `published`, `deleted`, `archived`, … Free vocabulary, per above. */
	@Column({ type: 'varchar', length: 64 })
	action: string;

	/** Bumped when the render of an entry's `data` changes, so an old row still reads correctly. */
	@Column({ type: 'int', default: 1 })
	typeVersion: number;

	/**
	 * Who did it. Every event written carries an acting user, so this is never null on insert —
	 * it goes null only when that user is deleted, which is what the foreign key is for. That is
	 * also why the column cannot be `NOT NULL`.
	 */
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	/**
	 * Null for entries about the instance rather than one project. A project deletion cascades its
	 * entries away; recording that deletion needs a resource vocabulary that covers projects, which
	 * is why no writer emits one yet.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 32, nullable: true })
	resourceType: ActivityResourceType | null;

	/**
	 * Deliberately not a foreign key, unlike every other reference in the schema. An entry has to
	 * outlive what it describes — "you deleted the Lead enrichment workflow" is the entry most worth
	 * keeping, and a CASCADE would erase it at exactly the moment it became interesting. The same
	 * mistake was made and undone on `workflow_review_activity.workflowId`. Reads therefore treat
	 * every pointer as possibly dangling, and expanding a deleted resource is an expected outcome.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	resourceId: string | null;

	/**
	 * Denormalised so an entry reads without a join — and so it survives the resource's deletion,
	 * which is the only remaining record of what the thing was called. Truncated on write.
	 */
	@Column({ type: 'text', nullable: true })
	resourceName: string | null;

	/**
	 * The little that makes an entry meaningful unexpanded: a save's node delta, and whether the
	 * assistant or the user made the change. Size-capped on write. No user ids — one stored here
	 * would outlive the user deletion that nulls `userId`.
	 */
	@JsonColumn({ nullable: true })
	data: IDataObject | null;
}
