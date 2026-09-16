import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentMessageQueue1789499956927 implements ReversibleMigration {
	async up({ isSqlite, schemaBuilder: { createTable, column } }: MigrationContext) {
		const id = isSqlite
			? column('id').int.primary.autoGenerate2
			: column('id').bigint.primary.autoGenerate2;
		await createTable('agent_message_queue')
			.withColumns(
				id,
				column('agentId').varchar(36).notNull.comment('Agent that processes this input.'),
				// The first input can precede its execution thread. No FK is possible here.
				column('threadId')
					.varchar(128)
					.notNull.comment('Existing conversation routing ID.'),
				column('source')
					.varchar(16)
					.notNull.withEnumCheck(['preview', 'integration'])
					.comment('Preview HTTP request or integration chat input.'),
				column('kind')
					.varchar(16)
					.notNull.withEnumCheck(['message', 'hitl'])
					.comment('Ordinary message or human response to a suspended run.'),
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['queued', 'processing'])
					.comment('Waiting input or input whose execution has started.'),
				column('payload').json.notNull.comment(
					'Typed input and actor, project, and reply routing data.',
				),
				column('executionId').varchar(36).comment('Execution recording for the active input.'),
			)
			.withTimestamps.withIndexOn(['threadId', 'status', 'kind', 'id'])
			.withIndexOn(['status', 'updatedAt'])
			.withIndexOn(['agentId'])
			.withIndexOn(['executionId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_message_queue');
	}
}
