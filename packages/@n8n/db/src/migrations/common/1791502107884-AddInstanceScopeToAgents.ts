import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';
const scopeCheck = 'agents_scope_project';

/**
 * Adds instance-scoped agents. An instance agent belongs to no project, so
 * its `projectId` is null. Its runtime comes from code, and each of its
 * threads carries its own working project. A CHECK constraint makes sure that
 * `projectId` is null exactly for instance agents.
 */
export class AddInstanceScopeToAgents1791502107884 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, dropNotNull },
		} = context;
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
		await this.addScopeCheck(context);
	}

	async down(context: MigrationContext) {
		const {
			schemaBuilder: { addNotNull, dropColumns, dropEnumCheck },
		} = context;
		// The old schema cannot store an agent without a project.
		await this.deleteInstanceAgents(context);
		await this.dropScopeCheck(context);
		await addNotNull(table, 'projectId', { recreatesOnSqlite: true });
		await dropEnumCheck(table, 'scope', { recreatesOnSqlite: true });
		await dropColumns(table, ['scope'], { recreatesOnSqlite: true });
	}

	private async addScopeCheck({ escape, queryRunner, tablePrefix }: MigrationContext) {
		const scope = escape.columnName('scope');
		const projectId = escape.columnName('projectId');
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${table}`,
			new TableCheck({
				name: `CHK_${tablePrefix}${scopeCheck}`,
				expression: `(${scope} = 'instance') = (${projectId} IS NULL)`,
			}),
		);
	}

	private async dropScopeCheck({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}${scopeCheck}`,
		);
	}

	/** Foreign keys are on here, so the database cascades to the dependent rows. */
	protected async deleteInstanceAgents({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName('projectId')} IS NULL`,
		);
	}
}
