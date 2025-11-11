import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * PostgreSQL-specific migration to change the default value for the `id` column in `user` table.
 * The previous default implementation was based on MD5 hashing to produce a random UUID, but
 * MD5 is not supported in FIPS compliant postgres environments. We are switching to `gen_random_uuid()`
 * which is supported in versions of PostgreSQL since 13.
 */
export class ChangeDefaultForIdInUserTable1762771264000 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName('user');
		const idColumnName = escape.columnName('id');

		await queryRunner.query(
			`ALTER TABLE ${tableName} ALTER COLUMN ${idColumnName} SET DEFAULT gen_random_uuid()`,
		);
	}
}
