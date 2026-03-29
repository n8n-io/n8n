import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * This migration expands the variables.value column from varchar(255) to text.
 *
 * Background:
 * - The original variables table was created with value as varchar(255)
 * - The TypeORM entity declares it as @Column('text') (unlimited)
 * - The documentation states the maximum value length is 1,000 characters
 * - The v1.118.0 release notes explicitly say the limit was increased to 1,000 chars
 * - Without this migration, PostgreSQL users hit a "value too long" error for
 *   variable values longer than 255 characters
 * - SQLite already uses TEXT for this column and is unaffected
 */
export class ExpandVariablesValueColumn1774500000000 implements IrreversibleMigration {
	async up({ escape, queryRunner }: MigrationContext) {
		const tableName = escape.tableName('variables');
		const columnName = escape.columnName('value');

		await queryRunner.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE TEXT;`);
	}
}
