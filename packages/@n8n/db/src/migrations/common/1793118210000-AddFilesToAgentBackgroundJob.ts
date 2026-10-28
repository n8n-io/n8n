import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddFilesToAgentBackgroundJob1793118210000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[column('files').json.comment('Output files that the job stored for the parent thread')],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['files'], { recreatesOnSqlite: true });
	}
}
