import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_events';

/**
 * A paged Instance AI history read resolves which runs the page needs by
 * filtering the thread's facts on a `createdAt` range. The table's other access
 * paths — the `(threadId, seq)` primary key and the `(threadId, runId)` index —
 * narrow to the thread but leave the range predicate to a scan of every event
 * row it holds, so the read cost tracked thread length rather than page size.
 *
 * Mirrors the index `instance_ai_run_snapshots` already carries for the same
 * windowed read on the snapshot side.
 */
export class AddInstanceAiEventsCreatedAtIndex1787141394735 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex(table, ['threadId', 'createdAt']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex(table, ['threadId', 'createdAt']);
	}
}
