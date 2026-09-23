import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * One lease per agent session (execution thread). A turn takes the lease in
 * the same transaction that records its `running` execution, so at most one
 * turn runs on a session at a time, across all mains.
 *
 * `threadId` deliberately has no foreign key: the row, and with it the epoch,
 * must survive session deletion, so that an epoch is never used twice for the
 * same thread id. A released lease keeps its row for the same reason.
 */
export class CreateAgentSessionLeaseTable1790156528882 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_session_lease')
			.withColumns(
				// Same width as agent_execution_threads.id.
				column('threadId').varchar(128).primary,
				column('agentId').varchar(36).notNull,
				column('ownerToken').uuid.comment(
					'Token of the current holder, new for each acquisition; NULL when free',
				),
				column('ownerHostId')
					.varchar(255)
					.comment('Host ID of the main that holds the lease; NULL when free'),
				column('epoch')
					.int.notNull.default(0)
					.comment('Incremented on each acquisition and never reset'),
				column('executionId')
					.varchar(36)
					.comment('Execution that holds the lease; no foreign key, the lease outlives it'),
				column('expiresAt')
					.timestampTimezone(3)
					.comment('Database-clock time after which another main can take over; NULL when free'),
			)
			// Covers the FK cascade scan when an agent is deleted.
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_session_lease');
	}
}
