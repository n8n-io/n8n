import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';

export class AddToolsColumnToAgents1778000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [column('tools').json.notNull.default("'{}'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['tools']);
	}
}
