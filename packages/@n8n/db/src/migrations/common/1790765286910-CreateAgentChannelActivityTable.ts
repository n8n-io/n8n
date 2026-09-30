import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * One row per channel, shared by every process. Kept apart from
 * `agent_channel_status`, whose rows are per process and are deleted on
 * shutdown, so a timestamp there would not survive a restart.
 *
 * `credentialId` has no foreign key, for the same reason as in
 * `agent_channel_status`: a channel refers to its credential by value.
 */
export class CreateAgentChannelActivityTable1790765286910 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_channel_activity')
			.withColumns(
				column('agentId').varchar(36).primary.comment('Agent that owns this channel'),
				column('integrationType')
					.varchar(64)
					.primary.comment('Chat integration platform for this channel'),
				column('credentialId')
					.varchar(36)
					.primary.comment('Credential connection that backs this channel'),
				column('lastInboundAt')
					.timestampTimezone()
					.notNull.comment('When the channel last received a message from a user'),
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_channel_activity');
	}
}
