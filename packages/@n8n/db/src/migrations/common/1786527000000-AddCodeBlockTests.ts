import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'code_block';

/** Adds unit-test storage to code blocks. No table references code_block, so
 * the SQLite table recreation cannot cascade. */
export class AddCodeBlockTests1786527000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE_NAME, [column('tests').json], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, ['tests'], { recreatesOnSqlite: true });
	}
}
