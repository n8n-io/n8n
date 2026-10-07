import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';

/**
 * Adds instance-scoped agents. An instance agent belongs to no project, so
 * its `projectId` is null. Its runtime comes from code, and each of its
 * threads carries its own working project.
 */
export class AddInstanceScopeToAgents1791502107884 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, dropNotNull } }: MigrationContext) {
		await addColumns(
			table,
			[
				column('scope')
					.varchar(16)
					.notNull.default("'project'")
					.withEnumCheck(['project', 'instance'])
					.comment(
						'project: belongs to projectId; instance: code-defined, belongs to no project (projectId is null)',
					),
			],
			{ recreatesOnSqlite: true },
		);
		await dropNotNull(table, 'projectId', { recreatesOnSqlite: true });
	}

	async down(context: MigrationContext) {
		const {
			schemaBuilder: { addNotNull, dropColumns, dropEnumCheck },
		} = context;
		// The old schema cannot store an agent without a project.
		await this.deleteInstanceAgents(context);
		await addNotNull(table, 'projectId', { recreatesOnSqlite: true });
		await dropEnumCheck(table, 'scope', { recreatesOnSqlite: true });
		await dropColumns(table, ['scope'], { recreatesOnSqlite: true });
	}

	/** Foreign keys are on here, so the database cascades to the dependent rows. */
	protected async deleteInstanceAgents({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName('projectId')} IS NULL`,
		);
	}
}
