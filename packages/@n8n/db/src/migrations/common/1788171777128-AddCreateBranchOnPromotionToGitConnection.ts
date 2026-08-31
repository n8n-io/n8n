import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'git_connection';
const columnName = 'createBranchOnPromotion';
const comment = 'When true, promotes land on a new branch for review instead of the target branch.';

export class AddCreateBranchOnPromotionToGitConnection1788171777128 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column },
	}: MigrationContext) {
		if (isSqlite) {
			// Raw ALTER instead of the DSL: TypeORM's addColumns recreates the table on SQLite,
			// and dropping git_connection cascades through git_connection_project's ON DELETE
			// CASCADE FK, wiping project-to-connection links. ADD COLUMN avoids the recreate.
			await runQuery(
				`ALTER TABLE ${escape.tableName(tableName)} ADD COLUMN ${escape.columnName(columnName)} boolean NOT NULL DEFAULT 0`,
			);
			return;
		}

		await addColumns(tableName, [column(columnName).bool.notNull.default(false).comment(comment)], {
			recreatesOnSqlite: true,
		});
	}

	async down({ isSqlite, escape, runQuery, schemaBuilder: { dropColumns } }: MigrationContext) {
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(tableName)} DROP COLUMN ${escape.columnName(columnName)}`,
			);
			return;
		}

		await dropColumns(tableName, [columnName], { recreatesOnSqlite: true });
	}
}
