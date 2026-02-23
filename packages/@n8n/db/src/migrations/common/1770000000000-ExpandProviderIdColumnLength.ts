import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class ExpandProviderIdColumnLength1770000000000 implements IrreversibleMigration {
	async up({ isPostgres, escape, queryRunner }: MigrationContext) {
		if (isPostgres) {
			const table = escape.tableName('auth_identity');
			const column = escape.columnName('providerId');
			await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE VARCHAR(255);`);
		}
		// SQLite doesn't enforce VARCHAR lengths, so no action needed
	}
}
