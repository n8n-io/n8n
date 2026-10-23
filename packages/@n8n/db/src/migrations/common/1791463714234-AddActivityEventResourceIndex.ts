import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'activity_event';

export class AddActivityEventResourceIndex1791463714234 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, tablePrefix }: MigrationContext) {
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
