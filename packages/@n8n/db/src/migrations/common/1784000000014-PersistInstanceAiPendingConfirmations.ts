import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const pendingConfirmationsTable = 'instance_ai_pending_confirmations';
const checkpointsTable = 'instance_ai_checkpoints';
const threadsTable = 'instance_ai_threads';
const userTable = 'user';
const checkpointTombstoneCheck = 'instance_ai_checkpoints_state_tombstone_check';

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
 * 2. `expiredAt` timestamp + nullable `state` on `instance_ai_checkpoints` —
 *    switches the checkpoint store from hard-delete-on-consume to soft-delete.
 *    `expiredAt IS NULL` means the snapshot is still live; a non-null value
 *    records when the snapshot was tombstoned and drives the GC sweep. A
 *    stale resume returns a clear "expired" error instead of "not found".
 */
export class PersistInstanceAiPendingConfirmations1784000000014 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { schemaBuilder, queryRunner, tablePrefix } = context;

		// Reshape `instance_ai_checkpoints` first, then create the table that
		// FKs into it. SQLite's `dropNotNull` recreates the table; doing that
		// while a FK already points at it would force a more fragile rebuild.
		await schemaBuilder.addColumns(checkpointsTable, [
			schemaBuilder
				.column('expiredAt')
				.timestampTimezone()
				.comment('Soft-delete timestamp: null means live; non-null marks the row as a tombstone.'),
		]);

		// Soft-delete sets `state = null` on consumed/pruned snapshots, so the
		// column must be nullable. Created NOT NULL in `1784000000007`.
		await schemaBuilder.dropNotNull(checkpointsTable, 'state');

		// Enforce the soft-delete invariant at the DB level: a tombstoned row
		// (`expiredAt` set) must have released its `state` blob.
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${checkpointsTable}`,
			new TableCheck({
				name: `${tablePrefix}${checkpointTombstoneCheck}`,
				expression: '("expiredAt" IS NOT NULL AND "state" IS NULL) OR "expiredAt" IS NULL',
			}),
		);

		await this.createPendingConfirmationsTable(context);
	}

	async down({
		schemaBuilder: { addNotNull, dropTable, dropColumns },
		queryRunner,
		tablePrefix,
		runQuery,
		escape,
	}: MigrationContext) {
		// Mirror `up()` in reverse: drop the FK-bearing table before mutating
		// the parent column on SQLite.
		await dropTable(pendingConfirmationsTable);

		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${checkpointsTable}`,
			`${tablePrefix}${checkpointTombstoneCheck}`,
		);

		// Soft-deleted tombstones (`state = NULL`) are unrecoverable, so dropping
		// them is the only way to re-add NOT NULL. Accepting data loss.
		const table = escape.tableName(checkpointsTable);
		const stateCol = escape.columnName('state');
		await runQuery(`DELETE FROM ${table} WHERE ${stateCol} IS NULL`);

		await addNotNull(checkpointsTable, 'state');
		await dropColumns(checkpointsTable, ['expiredAt']);
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
					.notNull.withEnumCheck(['suspended', 'inline'])
					.comment(
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
