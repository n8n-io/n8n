import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'agent_live_check_failure';

/**
 * One row for each code check that failed on a live execution of a published
 * agent. A check that passed writes nothing: the executions that ran a version
 * are the count of sessions checked, so failures alone give "4 of 212".
 */
export class CreateAgentLiveCheckFailure1794187823089 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('executionId').varchar(36).primary,
				column('checkId')
					.varchar(32)
					.primary.withEnumCheck([
						'tool:empty_reply',
						'tool:tool_failed',
						'tool:repeated_call',
						'tool:acted_after_no',
						'tool:hit_limit',
					])
					.comment('Code check that failed, from the agent-evals tool checks'),
				column('agentId').varchar(36).notNull,
				column('agentVersionId')
					.varchar(36)
					.notNull.comment('Published agent version that ran the execution'),
				column('reason').text.notNull.comment('Why the check failed, as shown to the builder'),
			)
			.withCreatedAt.withIndexOn(['agentVersionId', 'checkId'])
			.withIndexOn(['agentId'])
			.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentVersionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
