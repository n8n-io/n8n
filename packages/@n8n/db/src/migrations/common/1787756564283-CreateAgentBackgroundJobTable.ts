import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Durable registry of background jobs dispatched by top-level agents: detached
 * sub-agent runs and workflow executions parked at Wait nodes. The row is the
 * receipt handed to the model at dispatch and the source of truth for status
 * checks, cancellation and crash reconciliation, so it must outlive the chat
 * connection, the parent's turn, and backend restarts.
 *
 * `parentThreadId` deliberately has no foreign key: thread rows are created
 * lazily by execution recording, and a job can be registered before the
 * thread row exists.
 */
export class CreateAgentBackgroundJobTable1787756564283 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column } }: MigrationContext) {
		await createTable('agent_background_job')
			.withColumns(
				column('id').varchar(36).primary,
				column('kind')
					.varchar(16)
					.notNull.withEnumCheck(['subagent', 'workflow'])
					.comment('What the job tracks: a detached sub-agent run or a workflow execution'),
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['running', 'completed', 'failed', 'cancelled']),
				column('parentAgentId').varchar(36).notNull,
				// Thread ids are scoped with prefixes/user ids on some surfaces
				// (e.g. `test-<agentId>:<userId>`), so they exceed a bare uuid —
				// same width as agent_execution_threads.id.
				column('parentThreadId').varchar(128).notNull,
				column('projectId').varchar(36).notNull,
				column('title')
					.varchar(255)
					.notNull.comment('Task name or workflow name, echoed in status-check listings'),
				column('subAgentId').varchar(36).comment('Sub-agent jobs only'),
				column('childThreadId')
					.varchar(128)
					.comment('Sub-agent jobs only; minted at dispatch, links to agent_execution_threads'),
				column('childExecutionId').varchar(36).comment('Workflow jobs only'),
				column('workflowId').varchar(36).comment('Workflow jobs only; scopes cancellation'),
				column('dedupeKey')
					.varchar(255)
					.comment('Single-flight key, unique per parent thread while running; cleared at settle'),
				column('timeoutAt')
					.timestampTimezone(3)
					.comment('When reconciliation fails the job as timed out; NULL means no timeout'),
				column('result').text.comment('Final answer of a settled sub-agent job'),
				column('error').text,
				column('settledAt').timestampTimezone(3),
			)
			.withIndexOn('parentThreadId')
			.withIndexOn('childExecutionId')
			.withForeignKey('parentAgentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex(
			'agent_background_job',
			['parentThreadId', 'dedupeKey'],
			true,
			undefined,
			'"dedupeKey" IS NOT NULL',
		);

		// Reconciliation sweeps every couple of minutes on every main, filtering
		// on status = 'running' (and timeoutAt), while settled rows accumulate
		// without retention. The partial index only ever holds the small running
		// set, keeping the sweeps off the full table.
		await createIndex(
			'agent_background_job',
			['timeoutAt'],
			false,
			undefined,
			'"status" = \'running\'',
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_background_job');
	}
}
