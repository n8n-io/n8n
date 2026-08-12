import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'webhook_entity';

/**
 * Brings `webhookPath` of `:param` webhooks in line with the URL they serve, by
 * folding in the namespace segment that previously lived only in `webhookId`.
 *
 * Before, the same template registered by two workflows collided on the
 * `(webhookPath, method)` primary key even though their URLs differed by that
 * segment. `pathLength` is unchanged: it already counted the segments after the
 * namespace.
 */
export class NamespaceDynamicWebhookPaths1785900000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(TABLE);
		const path = escape.columnName('webhookPath');
		const id = escape.columnName('webhookId');

		await runQuery(
			`UPDATE ${table} SET ${path} = ${id} || '/' || ${path}
			 WHERE ${id} IS NOT NULL
			   AND ${path} <> ${id}
			   AND ${path} NOT LIKE ${id} || '/%'`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(TABLE);
		const path = escape.columnName('webhookPath');
		const id = escape.columnName('webhookId');

		await runQuery(
			`UPDATE ${table} SET ${path} = SUBSTR(${path}, LENGTH(${id}) + 2)
			 WHERE ${id} IS NOT NULL
			   AND ${path} LIKE ${id} || '/%'`,
		);
	}
}
