import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSuspensionToAgentBackgroundJob1788354438575 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[
				column('suspension').json.comment(
					'Sub-agent request for human input, including the checkpoint and resume context',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['suspension'], { recreatesOnSqlite: true });
	}
}
