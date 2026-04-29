import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a partial unique index on `node_access_request` so that a user can have at most
 * one `pending` request per (nodeType, projectId). This makes the application-level
 * check-then-create deduplication race-safe: concurrent requests will surface a
 * unique-violation that the service can swallow and treat as "already exists".
 *
 * Both supported dialects (Postgres and SQLite) support partial indexes with the same
 * `WHERE` clause syntax.
 */
export class AddPendingAccessRequestUniqueIndex1778500000000 implements ReversibleMigration {
	async up({ runQuery, escape }: MigrationContext) {
		const tableName = escape.tableName('node_access_request');
		const indexName = escape.indexName('node_access_request_pending_unique');
		const requestedById = escape.columnName('requestedById');
		const nodeType = escape.columnName('nodeType');
		const projectId = escape.columnName('projectId');
		const status = escape.columnName('status');

		await runQuery(
			`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${requestedById}, ${nodeType}, ${projectId}) WHERE ${status} = 'pending'`,
		);
	}

	async down({ runQuery, escape }: MigrationContext) {
		const indexName = escape.indexName('node_access_request_pending_unique');
		await runQuery(`DROP INDEX ${indexName}`);
	}
}
