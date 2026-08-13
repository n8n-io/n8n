import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentHarnessSession1786527334339 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_harness_sessions')
			.withColumns(
				column('agentId').varchar(36).primary.comment('Agent that owns the native harness session'),
				column('threadId').varchar(255).primary.comment('Conversation thread bound to the session'),
				column('runtimeIdentity')
					.varchar(64)
					.primary.comment('Hash of execution-affecting agent and harness configuration'),
				column('resourceId').varchar(255).notNull.comment('Memory resource scope for the thread'),
				column('adapter')
					.varchar(32)
					.notNull.withEnumCheck(['claude-code', 'codex'])
					.comment('Harness adapter that produced the opaque session state'),
				column('sessionId').varchar(255).notNull.comment('Native harness session identifier'),
				column('state').text.comment('Opaque serialized harness resume or continuation state'),
				column('status')
					.varchar(16)
					.notNull.default("'idle'")
					.withEnumCheck(['idle', 'claimed'])
					.comment('Whether a process currently owns the session'),
				column('ownershipEpoch')
					.int.notNull.default(0)
					.comment('Monotonic fencing epoch incremented for every successful claim'),
				column('claimToken').uuid.comment('Ephemeral token held by the current session owner'),
				column('claimExpiresAt')
					.timestampTimezone(3)
					.comment('Time after which another process may claim the session'),
				column('lastUsedAt')
					.timestampTimezone(3)
					.notNull.comment('Time of the latest saved turn state'),
				column('expiresAt')
					.timestampTimezone(3)
					.notNull.comment('Time after which the session may be pruned'),
			)
			.withIndexOn('expiresAt')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_harness_sessions');
	}
}
