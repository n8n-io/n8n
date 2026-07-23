import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add a partial index on `credentials_entity` for rows where `isGlobal = true`.
 *
 * Before every workflow execution, the permission check fetches the IDs of all
 * global credentials (`WHERE "isGlobal" = true`). Without an index on this
 * flag, that lookup scans the entire credentials table on every run, even
 * though only a handful of credentials are global. The partial index contains
 * only those rows, so the lookup becomes an index-only scan.
 */
export class AddPartialIndexForGlobalCredentials1784000000044 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, tablePrefix }: MigrationContext) {
		await createIndex(
			'credentials_entity',
			['id'],
			false,
			`IDX_${tablePrefix}credentials_entity_is_global`,
			'"isGlobal" = true',
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex('credentials_entity', ['id'], {
			customIndexName: `IDX_${tablePrefix}credentials_entity_is_global`,
		});
	}
}
