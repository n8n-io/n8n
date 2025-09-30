import type { MigrationContext, ReversibleMigration } from '../migration-types';

const VARIABLES_TABLE_NAME = 'variables';
const UNIQUE_PROJECT_KEY_INDEX_NAME = 'variables_project_key_unique';
const UNIQUE_GLOBAL_KEY_INDEX_NAME = 'variables_global_key_unique';
const PROJECT_ID_FOREIGN_KEY_NAME = 'variables_projectId_foreign';

/**
 * Adds a projectId column to the variables table to support project-scoped variables.
 * In MySQL, also adds a generated column (globalKey) to enforce uniqueness
 * for global variables (where projectId is null).
 */
export class AddProjectIdToVariableTable1758794506893 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, dropIndex, addForeignKey },
		queryRunner,
		escape,
	}: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);

		// Drop the old unique index on key
		await dropIndex(VARIABLES_TABLE_NAME, ['key'], { customIndexName: 'key' });

		// Add projectId and globalKey columns
		await addColumns(VARIABLES_TABLE_NAME, [column('projectId').varchar(36)]);

		// Add generated column for global uniqueness
		// Null values are considered unique in MySQL, so we create a generated column
		// that contains the key when projectId is null, and null otherwise.
		await queryRunner.query(`
			ALTER TABLE ${variablesTableName}
			ADD COLUMN globalKey VARCHAR(255) GENERATED ALWAYS AS (
				CASE WHEN projectId IS NULL THEN \`key\` ELSE NULL END
			) STORED;
		`);

		// Add foreign key to project
		// Create it after the generated column to avoid limits of mysql
		// https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
		// "A foreign key constraint on a stored generated column cannot use CASCADE"
		await addForeignKey(
			VARIABLES_TABLE_NAME,
			'projectId',
			['project', 'id'],
			PROJECT_ID_FOREIGN_KEY_NAME,
		);

		// Unique index for project-specific variables
		await queryRunner.query(`
			CREATE UNIQUE INDEX ${UNIQUE_PROJECT_KEY_INDEX_NAME}
			ON ${variablesTableName} (projectId, \`key\`);
		`);

		// Unique index for global variables
		await queryRunner.query(`
			CREATE UNIQUE INDEX ${UNIQUE_GLOBAL_KEY_INDEX_NAME}
			ON ${variablesTableName} (globalKey);
		`);
	}

	// Down migration do not use typeorm helpers
	// to prevent error with generated columns
	// because typeorm tries to fetch the column details from typeorm metadata
	async down({ queryRunner, escape }: MigrationContext) {
		const variablesTableName = escape.tableName(VARIABLES_TABLE_NAME);

		// Delete the rows with a non-null projectId (data loss)
		await queryRunner.query(`DELETE FROM ${variablesTableName} WHERE projectId IS NOT NULL;`);

		// Drop the generated column index
		await queryRunner.query(`DROP INDEX ${UNIQUE_GLOBAL_KEY_INDEX_NAME} ON ${variablesTableName};`);

		// Drop the generated column
		await queryRunner.query(`ALTER TABLE ${variablesTableName} DROP COLUMN globalKey;`);

		// Drop the project id column, foreign key and its associated index
		await queryRunner.query(
			`ALTER TABLE ${variablesTableName} DROP FOREIGN KEY ${PROJECT_ID_FOREIGN_KEY_NAME};`,
		);

		await queryRunner.query(
			`DROP INDEX ${UNIQUE_PROJECT_KEY_INDEX_NAME} ON ${variablesTableName};`,
		);

		await queryRunner.query(`ALTER TABLE ${variablesTableName} DROP COLUMN projectId;`);

		// Reset the original unique index on key
		await queryRunner.query(
			`ALTER TABLE ${variablesTableName} ADD CONSTRAINT \`key\` UNIQUE (\`key\`);`,
		);
	}
}
