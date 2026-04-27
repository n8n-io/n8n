import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add a uniquely-indexed `deduplicationKey` column to `execution_entity`.
 *
 * Holds an optional caller-supplied key that uniquely identifies the
 * logical execution. The unique index causes concurrent attempts with
 * the same key to fail on insert, so duplicates can be detected and
 * skipped instead of being run twice.
 *
 * Current use: the Schedule Trigger populates it with the canonical
 * cron firing time. Future uses may include webhook idempotency keys.
 */
export class AddExecutionDeduplicationKey1778000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('execution_entity', [column('deduplicationKey').varchar(255)]);
		// NOTE: partial unique index. Two inserts with the same non-null key race and the
		// second fails, so duplicates can be detected. Null rows are excluded from the index
		// entirely — executions without a dedupe key don't occupy index space and aren't
		// constrained to be unique.
		await createIndex(
			'execution_entity',
			['deduplicationKey'],
			/*isUnique=*/ true,
			/*customIndexName=*/ undefined,
			/*whereClause=*/ '"deduplicationKey" IS NOT NULL',
		);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('execution_entity', ['deduplicationKey']);
		await dropColumns('execution_entity', ['deduplicationKey']);
	}
}
