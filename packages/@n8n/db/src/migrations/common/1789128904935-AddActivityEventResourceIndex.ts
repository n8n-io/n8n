import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'activity_event';

/**
 * Serves one resource's own history: everything the feed holds about a single workflow or
 * credential, newest first. The table shipped with two indexes only, and this third one was held
 * back until a read needed it, because this is the highest-write table in the schema and every
 * index is paid for on insert.
 *
 * `resourceType` is not a key column. It narrows nothing, because an id is already unique per
 * resource kind, and leading with it would stop a read that filters `resourceId` alone from
 * seeking this index at all.
 */
export class AddActivityEventResourceIndex1789128904935 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, tablePrefix }: MigrationContext) {
		// `id` trails the pointer column so a newest-first scan of one resource is served by the
		// index alone, matching the two indexes the table already carries.
		await createIndex(
			ACTIVITY_TABLE,
			['resourceId', 'id'],
			false,
			`IDX_${tablePrefix}activity_event_resource`,
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex(ACTIVITY_TABLE, ['resourceId', 'id'], {
			customIndexName: `IDX_${tablePrefix}activity_event_resource`,
		});
	}
}
