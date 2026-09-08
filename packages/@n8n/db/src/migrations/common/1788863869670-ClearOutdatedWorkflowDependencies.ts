import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Delete workflow dependency rows written by index version 1. Version 2 of the
 * indexer also records `workflowCall` rows for sub-workflow tool and retriever
 * nodes. The rebuild on server start reindexes the affected workflows.
 */
export class ClearOutdatedWorkflowDependencies1788863869670 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('workflow_dependency');
		const indexVersionId = escape.columnName('indexVersionId');

		await runQuery(`DELETE FROM ${table} WHERE ${indexVersionId} < 2;`);
	}
}
