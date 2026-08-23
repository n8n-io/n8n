import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/** Must stay in sync with `VALUE_MAX_LENGTH` in `@n8n/api-types` `dto/variables/base.dto`. */
const VARIABLE_VALUE_MAX_LENGTH = 1000;

/**
 * Widens `variables.value` to TEXT and enforces the API max length at the database layer.
 */
export class ExpandVariablesValueColumnToText1777420800000 implements IrreversibleMigration {
	async up({ escape, queryRunner, tablePrefix }: MigrationContext) {
		const tableName = escape.tableName('variables');
		const valueColumn = escape.columnName('value');
		const constraintName = `${tablePrefix}variables_value_max_len`;

		await queryRunner.query(`ALTER TABLE ${tableName} ALTER COLUMN ${valueColumn} TYPE TEXT;`);

		await queryRunner.query(
			`ALTER TABLE ${tableName} ADD CONSTRAINT "${constraintName}" CHECK (${valueColumn} IS NULL OR char_length(${valueColumn}) <= ${VARIABLE_VALUE_MAX_LENGTH});`,
		);
	}
}
