import type { MigrationContext, ReversibleMigration } from '../migration-types';

type OwnedTable = { name: string; foreignKeyName: string };

const workflows: OwnedTable = {
	name: 'workflow_entity',
	foreignKeyName: 'FK_workflow_entity_owner_user',
};

const agents: OwnedTable = { name: 'agents', foreignKeyName: 'FK_agents_owner_user' };

export class AddOwnerUserIdToWorkflowsAndAgents1794910326111 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		for (const table of [workflows, agents]) {
			await this.addOwnerColumn(ctx, table);
		}
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		for (const { name } of [agents, workflows]) {
			await dropIndex(name, ['ownerUserId']);
			await dropColumns(name, ['ownerUserId'], { recreatesOnSqlite: true });
		}
	}

	/** A raw ALTER adds the column on SQLite without a rebuild of the table. */
	private async addOwnerColumn(
		{ schemaBuilder: { createIndex }, escape, runQuery, isPostgres }: MigrationContext,
		{ name, foreignKeyName }: OwnedTable,
	) {
		const table = escape.tableName(name);
		const ownerUserId = escape.columnName('ownerUserId');
		const idType = isPostgres ? 'uuid' : 'varchar';

		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${ownerUserId} ${idType} ` +
				`CONSTRAINT ${escape.columnName(foreignKeyName)} ` +
				`REFERENCES ${escape.tableName('user')} (${escape.columnName('id')}) ON DELETE SET NULL`,
		);
		await createIndex(name, ['ownerUserId']);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${ownerUserId} IS 'Person accountable for the resource. A member of its home project, or null'`,
			);
		}
	}
}
