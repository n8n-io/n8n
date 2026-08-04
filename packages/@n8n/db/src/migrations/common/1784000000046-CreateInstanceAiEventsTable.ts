import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_events';

/**
 * Append-only durable event log for Instance AI — the source of truth for
 * rendering and SSE replay. Rows are immutable; `seq` is the per-thread
 * monotonic replay cursor (assigned in the writer's per-thread drain).
 */
export class CreateInstanceAiEventsTable1784000000046 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary,
				column('seq').int.primary.comment('Per-thread monotonic sequence — the SSE replay cursor'),
				column('runId')
					.varchar(64)
					.notNull.comment('Run that emitted the event — opaque ID from the agent runtime'),
				column('type')
					.varchar(64)
					.notNull.comment('Event type discriminator, duplicated out of the payload'),
				column('payload').text.notNull.comment('JSON of the canonical InstanceAiEvent'),
			)
			// Run-scoped reads (agent-tree derivation) filter by (threadId, runId).
			.withIndexOn(['threadId', 'runId'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
