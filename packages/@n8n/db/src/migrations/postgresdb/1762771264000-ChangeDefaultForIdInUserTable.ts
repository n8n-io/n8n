import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * PostgreSQL-specific migration to change the default value for the `id` column in `user` table from a custom implementation to generate
 * a uuid to a build in function.
 */
export class ChangeDefaultForIdInUserTable1762771264000 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName('user');
		const idColumnName = escape.columnName('id');

		await queryRunner.query(
			`ALTER TABLE "${tableName}" ALTER COLUMN "${idColumnName}" SET DEFAULT gen_random_uuid()`,
		);
	}
}
