import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_VERSION_TABLE = 'app_version';

/** Short human-readable summary of what changed in a version, set by the AI Assistant after a turn. */
export class AddLabelToAppVersion1789120961813 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(APP_VERSION_TABLE, [column('label').varchar(128)], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(APP_VERSION_TABLE, ['label'], { recreatesOnSqlite: true });
	}
}
