import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_history';

export class ModifyWorkflowHistoryNodesAndConnections1695829275184 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, dropColumns, column } }: MigrationContext) {
		await dropColumns(tableName, ['nodes', 'connections']);
		await addColumns(tableName, [column('nodes').json.notNull, column('connections').json.notNull]);
	}

	async down({ schemaBuilder: { dropColumns, addColumns, column } }: MigrationContext) {
		await dropColumns(tableName, ['nodes', 'connections']);
		await addColumns(tableName, [column('nodes').text.notNull, column('connections').text.notNull]);
	}
}
