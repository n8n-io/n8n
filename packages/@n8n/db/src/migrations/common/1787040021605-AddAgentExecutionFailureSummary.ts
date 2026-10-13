import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionFailureSummary1787040021605 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('failureSummary').json.comment(
					'Execution failure projection as {count, latest} for session list queries',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_execution', ['failureSummary'], { recreatesOnSqlite: true });
	}
}
