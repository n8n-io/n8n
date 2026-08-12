import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'code_block';
const UNIQUE_PROJECT_NAME_INDEX = 'code_block_project_name_unique';
const UNIQUE_GLOBAL_NAME_INDEX = 'code_block_global_name_unique';

/**
 * Creates the code_block table for reusable code blocks callable from
 * expressions and Code nodes as `$global.<name>` / `$project.<name>`.
 * A null projectId means the block is instance-global.
 */
export class CreateCodeBlockTable1786517200000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, createIndex },
		queryRunner,
		escape,
	}: MigrationContext) {
		await createTable(TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').text.notNull,
				column('code').text.notNull,
				column('description').text,
				column('projectId').varchar(36),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createIndex(TABLE_NAME, ['projectId', 'name'], true, UNIQUE_PROJECT_NAME_INDEX);

		// Uniqueness for global blocks (projectId is null) needs a partial index
		await queryRunner.query(
			`CREATE UNIQUE INDEX "${UNIQUE_GLOBAL_NAME_INDEX}"
			 ON ${escape.tableName(TABLE_NAME)} (${escape.columnName('name')})
			 WHERE ${escape.columnName('projectId')} IS NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE_NAME);
	}
}
