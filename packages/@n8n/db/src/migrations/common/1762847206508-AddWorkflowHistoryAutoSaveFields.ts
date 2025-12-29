import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_history';
const name = 'name';
const autosaved = 'autosaved';
const description = 'description';

export class AddWorkflowHistoryAutoSaveFields1762847206508 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(tableName, [
			column(name).varchar(128),
			column(autosaved).bool.notNull.default(false),
			column(description).text,
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, [name, autosaved, description]);
	}
}
