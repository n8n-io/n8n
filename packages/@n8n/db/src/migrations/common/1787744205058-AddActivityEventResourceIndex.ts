import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'activity_event';
const INDEX_COLUMNS = ['resourceType', 'resourceId', 'id'];

/**
 * Serves the read behind expanding an activity entry: everything else recorded about the same
 * resource, newest first. Held back until that read existed — `activity_event` takes a write per
 * finished execution, so an index it does not serve is a pure insert cost.
 */
export class AddActivityEventResourceIndex1787744205058 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, tablePrefix }: MigrationContext) {
		await createIndex(
			ACTIVITY_TABLE,
			INDEX_COLUMNS,
			false,
			`IDX_${tablePrefix}activity_event_resource`,
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex(ACTIVITY_TABLE, INDEX_COLUMNS, {
			customIndexName: `IDX_${tablePrefix}activity_event_resource`,
			skipIfMissing: true,
		});
	}
}
