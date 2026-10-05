import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';

/**
 * Adds instance-level agents. An instance agent belongs to no project and
 * is available to every user with access. Its runtime comes from code.
 * Each of its threads carries its own working project.
 */
export class AddInstanceScopeToAgents1791238469895 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, dropNotNull } }: MigrationContext) {
		await addColumns(
			table,
			[
				column('scope')
					.varchar(16)
					.notNull.default("'project'")
					.withEnumCheck(['project', 'instance'])
					.comment('project: belongs to projectId; instance: belongs to no project'),
			],
			{ recreatesOnSqlite: true },
		);
		await dropNotNull(table, 'projectId', { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { addNotNull, dropColumns }, escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName('projectId')} IS NULL`,
		);
		await addNotNull(table, 'projectId', { recreatesOnSqlite: true });
		await dropColumns(table, ['scope'], { recreatesOnSqlite: true });
	}
}
