import type { MigrationContext, ReversibleMigration } from '../migration-types';

const VARIABLES_TABLE_NAME = 'variables';
const UNIQUE_PROJECT_KEY_INDEX_NAME = 'variables_project_key_unique';
const UNIQUE_GLOBAL_KEY_INDEX_NAME = 'variables_global_key_unique';

/**
 * Adds a projectId column to the variables table to support project-scoped variables.
 * Also updates the unique constraints to allow the same key to be used in different projects,
 * while still enforcing uniqueness for global variables (where projectId is null).
 */
export class AddProjectIdToVariableTable1758794506893 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey },
		queryRunner,
		tablePrefix,
		escape,
	}: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);

		// Drop the remaining redundant index created on 1690000000000-MigrateIntegerKeysToString
		await queryRunner.query(`DROP INDEX IF EXISTS "pk_${tablePrefix}variables_id";`);

		// Drop the unique index on key to allow multiple projects to have variables with the same key
		await queryRunner.query(
			`ALTER TABLE ${variablesTableName} DROP CONSTRAINT ${tablePrefix}variables_key_key;`,
		);

		await addColumns(VARIABLES_TABLE_NAME, [column('projectId').varchar(36)]);
		await addForeignKey(VARIABLES_TABLE_NAME, 'projectId', ['project', 'id'], undefined, 'CASCADE');

		// Create index for unique project key (projectId not null)
		await queryRunner.query(`
      CREATE UNIQUE INDEX "${UNIQUE_PROJECT_KEY_INDEX_NAME}"
      ON ${variablesTableName} ("projectId", "key")
			WHERE "projectId" IS NOT NULL;
    `);

		// Create index for global variables (projectId is null)
		await queryRunner.query(`
      CREATE UNIQUE INDEX "${UNIQUE_GLOBAL_KEY_INDEX_NAME}"
      ON ${variablesTableName} (key)
      WHERE "projectId" IS NULL;
    `);
	}

	async down({
		schemaBuilder: { dropColumns, dropIndex, dropForeignKey },
		queryRunner,
		tablePrefix,
		escape,
	}: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);

		// Drop the two indexes created in the up migration
		await dropIndex(VARIABLES_TABLE_NAME, ['projectId', 'key'], {
			customIndexName: UNIQUE_PROJECT_KEY_INDEX_NAME,
		});
		await dropIndex(VARIABLES_TABLE_NAME, ['key'], {
			customIndexName: UNIQUE_GLOBAL_KEY_INDEX_NAME,
		});

		// Delete the rows with a non-null projectId
		await queryRunner.query(`DELETE FROM ${variablesTableName} WHERE "projectId" IS NOT NULL;`);

		// Remove foreign key constraints and drop the projectId column
		await dropForeignKey(VARIABLES_TABLE_NAME, 'projectId', ['project', 'id']);
		await dropColumns(VARIABLES_TABLE_NAME, ['projectId']);

		// Recreate the original unique index on key
		await queryRunner.query(`
			ALTER TABLE ${variablesTableName}
			ADD CONSTRAINT ${tablePrefix}variables_key_key UNIQUE ("key");
		`);
	}
}
