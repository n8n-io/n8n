import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a partial composite index on execution_entity(workflowId, status, id DESC)
 * filtered to non-deleted rows (deletedAt IS NULL).
 *
 * Without this index Postgres performs a parallel sequential scan of the full
 * execution_entity table for every paginated executions-list request, because
 * the CASE-based ORDER BY and the access-control IN/EXISTS subquery prevent the
 * planner from using any narrower path.
 *
 * With this index the planner can do per-workflowId range scans (one index seek
 * per accessible workflow) and merge them into the top-N result without touching
 * irrelevant rows, dropping the query from a full-table sequential scan to a
 * bounded index walk.
 *
 * Partial (WHERE deletedAt IS NULL) keeps the index small: pruned executions are
 * excluded and never appear in list queries.
 *
 * Postgres-only migration: partial functional indexes are a Postgres feature;
 * SQLite is not affected by this performance class of issue at n8n scale.
 */
export class AddExecutionEntityWorkflowStatusIndex1784000000031 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape }: MigrationContext) {
		const col = (c: string) => escape.columnName(c);

		await createIndex(
			'execution_entity',
			['workflowId', 'status', 'id'],
			false,
			undefined,
			`${col('deletedAt')} IS NULL`,
		);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['workflowId', 'status', 'id'], { skipIfMissing: true });
	}
}
