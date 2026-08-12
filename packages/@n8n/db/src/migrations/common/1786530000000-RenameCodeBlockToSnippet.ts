import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * The code-blocks feature was renamed to snippets before release.
 * Index drops/creates are conditional: the SQLite table recreation in
 * AddCodeBlockTests does not preserve the raw-SQL partial index, so the old
 * index names may or may not exist depending on the dialect.
 */
export class RenameCodeBlockToSnippet1786530000000 implements ReversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${escape.tableName('code_block')} RENAME TO ${escape.tableName('snippet')}`,
		);
		await queryRunner.query('DROP INDEX IF EXISTS "code_block_project_name_unique"');
		await queryRunner.query('DROP INDEX IF EXISTS "code_block_global_name_unique"');
		await queryRunner.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "snippet_project_name_unique"
			 ON ${escape.tableName('snippet')} (${escape.columnName('projectId')}, ${escape.columnName('name')})`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "snippet_global_name_unique"
			 ON ${escape.tableName('snippet')} (${escape.columnName('name')})
			 WHERE ${escape.columnName('projectId')} IS NULL`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${escape.tableName('snippet')} RENAME TO ${escape.tableName('code_block')}`,
		);
		await queryRunner.query('DROP INDEX IF EXISTS "snippet_project_name_unique"');
		await queryRunner.query('DROP INDEX IF EXISTS "snippet_global_name_unique"');
		await queryRunner.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "code_block_project_name_unique"
			 ON ${escape.tableName('code_block')} (${escape.columnName('projectId')}, ${escape.columnName('name')})`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "code_block_global_name_unique"
			 ON ${escape.tableName('code_block')} (${escape.columnName('name')})
			 WHERE ${escape.columnName('projectId')} IS NULL`,
		);
	}
}
