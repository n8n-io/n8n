import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Drops the git-connection tables. The promotions tables replace them, and the
 * feature was never released, so there is no data to keep and no down path.
 *
 * Local checkouts under `<n8nFolder>/git-connections/` are left alone. A migration
 * must not delete files, so remove them by hand once the old feature is stopped.
 */
export class DropGitConnectionTables1788780616817 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropTable } }: MigrationContext) {
		// The link table holds the foreign key, so it goes first.
		await dropTable('git_connection_project');
		await dropTable('git_connection');
	}
}
