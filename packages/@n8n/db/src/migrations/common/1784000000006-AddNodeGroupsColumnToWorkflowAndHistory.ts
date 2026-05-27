import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddNodeGroupsColumnToWorkflowAndHistory1784000000006 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('nodeGroups').json.notNull.default("'[]'")], {
			ackThisRecreatesOnSqlite: true,
		});
		await addColumns('workflow_history', [column('nodeGroups').json.notNull.default("'[]'")], {
			ackThisRecreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['nodeGroups'], { ackThisRecreatesOnSqlite: true });
		await dropColumns('workflow_history', ['nodeGroups'], { ackThisRecreatesOnSqlite: true });
	}
}
