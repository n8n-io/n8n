import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Links a `scheduled_job` row to the agent that owns it. Agent jobs carry
 * `workflowId = NULL`, so without this table they would be invisible to
 * per-agent queries and cleanup. One row per agent-owned job.
 *
 * Deleting the agent cascades the link rows; the jobs themselves are removed
 * by the agents module's reconcile path, which also handles unpublish.
 */
export class CreateAgentTaskScheduleTable1787146558741 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_task_schedule')
			.withColumns(
				column('jobId').int.primary.comment('The scheduled_job this agent owns'),
				column('agentId').varchar(36).notNull.comment('Owning agent'),
				column('taskId')
					.varchar(32)
					.comment(
						'Agent task definition this job was provisioned from; null for agent-owned jobs with no task body',
					),
			)
			.withForeignKey('jobId', {
				tableName: 'scheduled_job',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['agentId']).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_task_schedule');
	}
}
