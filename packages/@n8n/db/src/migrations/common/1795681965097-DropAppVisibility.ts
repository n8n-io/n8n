import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Apps are visible only to the members of their project, so the `visibility` column has no use.
 * The migration is irreversible because it discards the stored values.
 */
export class DropAppVisibility1795681965097 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropEnumCheck, dropColumns } }: MigrationContext) {
		// On SQLite, the table rebuild keeps the CHECK, so remove it before the column.
		await dropEnumCheck('app', 'visibility', { recreatesOnSqlite: true });
		await dropColumns('app', ['visibility'], { recreatesOnSqlite: true });
	}
}
