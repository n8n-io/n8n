import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddMisfireSettingsToAgentTasks1788865443826 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		for (const table of ['agent_task_definition', 'agent_task_snapshot']) {
			await addColumns(
				table,
				[
					column('misfirePolicy')
						.varchar(16)
						.withEnumCheck(['skip', 'coalesce'])
						.comment('Missed-run policy; null keeps the current skip behavior'),
					column('misfireGraceSeconds').int.comment(
						'Per-task grace in seconds; null or zero uses the instance setting',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		for (const table of ['agent_task_definition', 'agent_task_snapshot']) {
			await dropColumns(table, ['misfirePolicy', 'misfireGraceSeconds'], {
				recreatesOnSqlite: true,
			});
		}
	}
}
