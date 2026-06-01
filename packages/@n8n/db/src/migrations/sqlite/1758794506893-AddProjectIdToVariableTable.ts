import type { MigrationContext, ReversibleMigration } from '../migration-types';
const VARIABLES_TABLE_NAME = 'variables';
const VARIABLES_TEMP_TABLE_NAME = 'variables_temp';
const UNIQUE_PROJECT_KEY_INDEX_NAME = 'variables_project_key_unique';
const UNIQUE_GLOBAL_KEY_INDEX_NAME = 'variables_global_key_unique';
/**
 * Adds a projectId column to the variables table to support project-scoped variables.
 * Also updates the unique constraints to allow the same key to be used in different projects,
 * while still enforcing uniqueness for global variables (where projectId is null).
 */
export class AddProjectIdToVariableTable1758794506893 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, createIndex, dropTable },
		queryRunner,
		escape,
		copyTable,
	}: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);
		const tempVariablesTableName = escape.tableName(VARIABLES_TEMP_TABLE_NAME);

		await createTable(VARIABLES_TEMP_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('key').text.notNull,
				column('type').text.notNull.default("'string'"),
				column('value').text,
				column('projectId').varchar(36),
			)
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' });

		// Create unique index for project variables (projectId not null)
		await createIndex(
			VARIABLES_TEMP_TABLE_NAME,
			['projectId', 'key'],
			true,
			UNIQUE_PROJECT_KEY_INDEX_NAME,
		);

		// Create unique index for global variables (projectId is null)
		await queryRunner.query(
			`CREATE UNIQUE INDEX "${UNIQUE_GLOBAL_KEY_INDEX_NAME}"
			 ON ${tempVariablesTableName} ("key")
			 WHERE projectId IS NULL`,
		);

		// Copy data from old table to new table
		await copyTable(
			VARIABLES_TABLE_NAME,
			VARIABLES_TEMP_TABLE_NAME,
			['id', 'key', 'type', 'value'],
			['id', 'key', 'type', 'value'],
		);

		// Drop old table
		await dropTable(VARIABLES_TABLE_NAME);

		await queryRunner.query(
			`ALTER TABLE ${tempVariablesTableName} RENAME TO ${variablesTableName};`,
		);
	}

	async down({
		schemaBuilder: { createTable, column, createIndex, dropTable },
		queryRunner,
		escape,
	}: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);
		const tempVariablesTableName = escape.tableName(VARIABLES_TEMP_TABLE_NAME);

		// Create temp table with the old schema (no projectId)
		await createTable(VARIABLES_TEMP_TABLE_NAME).withColumns(
			column('id').varchar(36).primary.notNull,
			column('key').text.notNull,
			column('type').text.notNull.default("'string'"),
			column('value').text,
		);

		// Copy data from current table into temp table (dropping projectId)
		// We only copy rows where projectId is null to avoid unique constraint violations

		await queryRunner.query(
			`INSERT INTO ${tempVariablesTableName} (id, "key", type, value) SELECT id, "key", type, value FROM ${variablesTableName} WHERE projectId IS NULL;`,
		);

		// Drop current table
		await dropTable(VARIABLES_TABLE_NAME);

		// Rename temp table back to original name
		await queryRunner.query(
			`ALTER TABLE ${tempVariablesTableName} RENAME TO ${variablesTableName};`,
		);

		// Recreate original unique index on key
		await createIndex(VARIABLES_TABLE_NAME, ['key'], true);
	}
}
