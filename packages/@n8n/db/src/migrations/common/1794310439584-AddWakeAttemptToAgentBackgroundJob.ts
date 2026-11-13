import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWakeAttemptToAgentBackgroundJob1794310439584 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Nullable: only results that a started wake has received carry an attempt.
		await addColumns(
			'agent_background_job',
			[
				column('wakeAttemptId').uuid.comment(
					'Wake attempt that started with this result. Recovery marks the result consumed instead of running the wake again.',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['wakeAttemptId'], { recreatesOnSqlite: true });
	}
}
