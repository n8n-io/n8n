import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CHANNEL_STATUSES = ['connected', 'error'];

/**
 * Per-process rows: `hostId` is part of the key so each row has one writer, and
 * mains running the same channel never overwrite one another.
 *
 * `integrationType` deliberately has no enum check: it mirrors the platform
 * registry, and constraining it here would mean a migration every time a
 * platform is added — for a table that only reports what happened.
 *
 * `credentialId` deliberately has no foreign key. A deleted credential is one of
 * the likeliest reasons a channel is down, and deleting one neither rewrites the
 * agent's channels nor stops them being started, so the row saying "credential
 * not found" has to be writable even after its credential is gone.
 */
export class CreateAgentChannelStatusTable1787213245846 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_channel_status')
			.withColumns(
				column('agentId').varchar(36).primary.comment('Agent that owns this channel'),
				column('integrationType')
					.varchar(64)
					.primary.comment('Chat integration platform for this channel'),
				column('credentialId')
					.varchar(36)
					.primary.comment(
						'Credential connection that backs this channel; no FK so a failure is still recordable after the credential is deleted',
					),
				column('hostId')
					.varchar(128)
					.primary.comment('Process that observed this; the only writer of this row'),
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(CHANNEL_STATUSES)
					.comment('What this process last observed: connected or error'),
				column('errorMessage').text.comment(
					'Why this process could not start the channel; null once it succeeds',
				),
				column('attempts')
					.int.notNull.default(0)
					.comment('Consecutive failed startup attempts by this process, reset on success'),
				column('backoffUntil')
					.timestampTimezone()
					.comment('Earliest this process should retry; null when there is nothing to retry'),
				column('expiresAt')
					.timestampTimezone()
					.comment(
						'When this row stops counting unless its owner refreshes it; null never expires',
					),
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// Every pass reads this instance's own rows, and `hostId` is last in the
			// primary key, so there is no prefix to use.
			.withIndexOn(['hostId'])
			// The leader sweeps rows left behind by processes that crashed.
			.withIndexOn(['expiresAt']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_channel_status');
	}
}
