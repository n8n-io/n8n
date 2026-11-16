import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Runs before `AddInstanceScopeToAgents` on revert. That migration recreates
 * `agents` with foreign keys off on SQLite, so deleting instance agents there
 * does not cascade. This migration keeps foreign keys on and deletes them
 * first, so the cascades also delete the rows that depend on them.
 */
export class DeleteInstanceAgentsOnRevert1792139680416 implements ReversibleMigration {
	async up() {
		// Nothing to change on upgrade. This migration only does work on revert.
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName('agents')} WHERE ${escape.columnName('scope')} = 'instance'`,
		);
	}
}
