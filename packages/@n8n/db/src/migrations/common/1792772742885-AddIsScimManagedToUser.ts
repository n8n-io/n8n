import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'user';
const COLUMN = 'isScimManaged';

/**
 * Adds `isScimManaged` to `user`. It is true for a user that SCIM
 * provisioning created, updated or deactivated. Earlier releases (2.45.x)
 * could create users through SCIM but did not record it. Thus existing users
 * start as false, and the next SCIM write to a user sets the marker.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: many tables
 * have a foreign key to `user`, and the DSL recreates the table on SQLite,
 * which would fire their CASCADE.
 */
export class AddIsScimManagedToUser1792772742885 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName(TABLE);
		const columnName = escape.columnName(COLUMN);

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} BOOLEAN NOT NULL DEFAULT FALSE`,
		);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${columnName} IS 'True when SCIM provisioning created, updated or deactivated the user.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName(TABLE);
		const columnName = escape.columnName(COLUMN);

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
