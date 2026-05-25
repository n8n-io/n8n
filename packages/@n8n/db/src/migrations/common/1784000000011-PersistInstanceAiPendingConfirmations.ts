import type { MigrationContext, ReversibleMigration } from '../migration-types';

const pendingConfirmationsTable = 'instance_ai_pending_confirmations';
const checkpointsTable = 'instance_ai_checkpoints';
const threadsTable = 'instance_ai_threads';
const userTable = 'user';

/**
 * Move the Instance AI HITL confirmation state into the database so it
 * survives process restarts.
 *
 * Two paired changes:
 *
 * 1. New `instance_ai_pending_confirmations` table — a durable index of HITL
 *    confirmations the assistant is waiting on. The agent's
 *    `SerializableAgentState` blob already lives in `instance_ai_checkpoints`;
 *    this table is the lookup that lets a fresh process find a confirmation
 *    after the in-memory `pendingConfirmations` / `suspendedRuns` maps are
 *    gone.
 *
 * 2. `expired` flag + nullable `state` on `instance_ai_checkpoints` —
 *    switches the checkpoint store from hard-delete-on-consume to soft-delete.
 *    A stale resume returns a clear "expired" error instead of "not found".
 */
export class PersistInstanceAiPendingConfirmations1784000000011 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { schemaBuilder } = context;

		await this.createPendingConfirmationsTable(context);

		await schemaBuilder.addColumns(checkpointsTable, [
			schemaBuilder
				.column('expired')
				.bool.notNull.default(false)
				.comment('Soft-delete flag: true means the snapshot has been consumed or pruned.'),
		]);

		// Soft-delete sets `state = null` on consumed/pruned snapshots, so the
		// column must be nullable. Created NOT NULL in `1784000000007`.
		await schemaBuilder.dropNotNull(checkpointsTable, 'state');
	}

	async down({
		schemaBuilder: { addNotNull, dropTable, dropColumns },
		runQuery,
		escape,
	}: MigrationContext) {
		// Soft-deleted tombstones (`state = NULL`) are unrecoverable, so dropping
		// them is the only way to re-add NOT NULL. Accepting data loss.
		const table = escape.tableName(checkpointsTable);
		const stateCol = escape.columnName('state');
		await runQuery(`DELETE FROM ${table} WHERE ${stateCol} IS NULL`);

		await addNotNull(checkpointsTable, 'state');
		await dropColumns(checkpointsTable, ['expired']);
		await dropTable(pendingConfirmationsTable);
	}

	private async createPendingConfirmationsTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(pendingConfirmationsTable)
			.withColumns(
				column('requestId').varchar(36).primary.comment('HITL confirmation request identifier.'),
				column('threadId').uuid.notNull.comment('Instance AI thread that owns the confirmation.'),
				column('userId').uuid.notNull.comment('User who is expected to confirm or cancel.'),
				column('kind')
					.varchar(16)
					.notNull.comment(
						"'suspended' (resumable from checkpoint) or 'inline' (orchestrator-held Promise).",
					),
				column('runId')
					.varchar(36)
					.notNull.comment('External run ID; reused on resume for SSE correlation.'),
				column('toolCallId').varchar(64).comment('Suspended tool call awaiting confirmation.'),
				column('messageGroupId').varchar(36).comment('SSE event correlation group.'),
				column('checkpointKey')
					.varchar(255)
					.comment('FK to instance_ai_checkpoints.key; also the SDK runId used to resume.'),
				column('checkpointTaskId')
					.varchar(36)
					.comment('Set when the suspended run was a planned-task checkpoint follow-up.'),
				column('expiresAt')
					.timestampTimezone()
					.comment('TTL for the leader-only sweep; null disables auto-expiry.'),
			)
			.withIndexOn('threadId')
			.withIndexOn('userId')
			.withIndexOn('checkpointKey')
			.withIndexOn('expiresAt')
			.withForeignKey('threadId', {
				tableName: threadsTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('checkpointKey', {
				tableName: checkpointsTable,
				columnName: 'key',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}
}
