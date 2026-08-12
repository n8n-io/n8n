import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * `workflow_entity` is sorted by `updatedAt` on every workflow list page and by
 * the command-bar node content search, but the column was unindexed, so both
 * queries sorted the whole table.
 *
 * It matters most for the node search, which filters on a non-sargable
 * `nodes LIKE '%...%'` and takes the top N. With the index the planner walks
 * `updatedAt` in order and stops once the limit is filled instead of scanning
 * and sorting every row. Measured on a 20k-workflow SQLite corpus
 * (`packages/cli/test/performance/node-search-variants.perf.ts`):
 * a broad query went from 149ms to 0.9ms, and the plan changed to
 * `SCAN w USING INDEX`.
 */
export class AddUpdatedAtIndexToWorkflowEntity1786525332822 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('workflow_entity', ['updatedAt']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('workflow_entity', ['updatedAt'], { skipIfMissing: true });
	}
}
