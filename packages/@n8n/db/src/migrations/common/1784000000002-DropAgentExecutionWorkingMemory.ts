import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DropAgentExecutionWorkingMemory1784000000002 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_execution', ['workingMemory']);
	}

	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agent_execution', [column('workingMemory').text]);
	}
}
