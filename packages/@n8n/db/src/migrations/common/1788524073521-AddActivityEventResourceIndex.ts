import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'activity_event';

/**
 * Serves one resource's own history: everything the feed knows about a single workflow or
 * credential, newest first. Held back from the table's own migration until a read needed it,
 * because this is the highest-write table in the schema and every index is paid for on insert.
 */
export class AddActivityEventResourceIndex1788524073521 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, tablePrefix }: MigrationContext) {
		// `id` trails the pointer columns so a newest-first scan of one resource is served by the
		// index alone, matching the two indexes the table already carries.
		await createIndex(
			ACTIVITY_TABLE,
			['resourceType', 'resourceId', 'id'],
			false,
			`IDX_${tablePrefix}activity_event_resource`,
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex(ACTIVITY_TABLE, ['resourceType', 'resourceId', 'id'], {
			customIndexName: `IDX_${tablePrefix}activity_event_resource`,
		});
	}
}
