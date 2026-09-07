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
export class CreateAgentBackgroundJobTable1788191436461 implements ReversibleMigration {
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
				column('title')
					.varchar(255)
					.notNull.comment('Task name or workflow name, echoed in status-check listings'),
				column('subAgentId').varchar(36).comment('Sub-agent jobs only'),
				column('childThreadId')
					.varchar(128)
					.comment('Sub-agent jobs only; minted at dispatch, links to agent_execution_threads'),
				column('childExecutionId').varchar(36).comment('Workflow jobs only'),
				column('workflowId').varchar(36).comment('Workflow jobs only; scopes cancellation'),
				column('timeoutAt')
					.timestampTimezone(3)
					.comment('When reconciliation fails the job as timed out; NULL means no timeout'),
				column('result').text.comment('Final answer of a settled sub-agent job'),
				column('error').text,
				column('settledAt').timestampTimezone(3),
			)
			.withIndexOn(['parentThreadId', 'status'])
			// Covers the FK cascade scan when an agent is deleted.
			.withIndexOn('parentAgentId')
			.withForeignKey('parentAgentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// For jobs data retention sweep
			.withIndexOn('settledAt').withTimestamps;

		// At most one tracker per workflow execution
		await createIndex(
			'agent_background_job',
			['childExecutionId'],
			true,
			undefined,
			'"childExecutionId" IS NOT NULL',
		);

		// Reconciliation sweeps every couple of minutes on every main, filtering
		// on status = 'running' (and timeoutAt)
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
