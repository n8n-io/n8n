import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Expands the variables.value column from varchar(255) to TEXT.
 *
 * The original CreateVariables migration (1677501636754) created the column as
 * varchar(255), but the entity definition uses @Column('text') and the
 * documented limit is 1,000 characters.  PostgreSQL enforces the varchar(255)
 * constraint, causing "value too long for type character varying(255)" errors.
 *
 * SQLite is unaffected because it does not enforce varchar length limits.
 *
 * Ref: https://github.com/n8n-io/n8n/issues/27236
 */
export class ExpandVariablesValueColumnToText1772800000000 implements IrreversibleMigration {
	async up({ escape, queryRunner }: MigrationContext) {
		const tableName = escape.tableName('variables');
		const columnName = escape.columnName('value');

		await queryRunner.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE TEXT;`);
	}
}
