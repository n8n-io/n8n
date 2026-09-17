import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentMessageQueue1789499956927 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		schemaBuilder: { createTable, createIndex, column },
	}: MigrationContext) {
		// SQLite needs AUTOINCREMENT so a stale Stop cannot target a reused queue ID.
		const id = isSqlite
			? column('id').int.primary.autoGenerate
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
					.notNull.withEnumCheck(['queued', 'processing', 'cancelling'])
					.comment('Waiting, active, or cancelling input.'),
				column('payload').json.notNull.comment(
					'Typed input and actor, project, and reply routing data.',
				),
				column('executionId').varchar(36).comment('Execution recording for the active input.'),
			)
			.withTimestamps.withIndexOn(['threadId', 'status', 'kind', 'id'])
			.withIndexOn(['status', 'updatedAt'])
			.withIndexOn(['agentId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
		await createIndex(
			'agent_message_queue',
			['executionId'],
			true,
			undefined,
			`${escape.columnName('executionId')} IS NOT NULL`,
		);
		await createTable('agent_conversation_lease')
			.withColumns(
				// Ownership must work before the first execution thread exists.
				column('threadId')
					.varchar(128)
					.primary.comment('Conversation routing ID.'),
				column('agentId').varchar(36).notNull,
				column('ownerToken').uuid.notNull.comment('Fresh identity for one execution owner.'),
				column('expiresAt')
					.timestampTimezone()
					.notNull.comment('Lease expiry on the database clock.'),
			)
			.withIndexOn(['agentId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' });
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_conversation_lease');
		await dropTable('agent_message_queue');
	}
}
