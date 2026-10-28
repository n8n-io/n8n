import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkippedFilesToAgentBackgroundJob1793118210001 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[column('skippedFiles').json.comment('Output files that were too large to store')],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['skippedFiles'], { recreatesOnSqlite: true });
	}
}
