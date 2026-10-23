import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddPlanTaskToAgentBackgroundJob1792584485671 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey, createIndex },
	}: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[
				column('planId').uuid.comment('Plan that owns this work'),
				column('planTaskId').uuid.comment('Task ID in the saved plan document'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_background_job',
			'planId',
			['agent_plan', 'id'],
			undefined,
			'SET NULL',
		);
		await createIndex('agent_background_job', ['planId', 'planTaskId']);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('agent_background_job', ['planId', 'planTaskId']);
		await dropColumns('agent_background_job', ['planId', 'planTaskId'], {
			recreatesOnSqlite: true,
		});
	}
}
