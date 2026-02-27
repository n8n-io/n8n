import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'user';

/**
 * Adds all agent-related columns to the user table in a single migration.
 *
 * Columns added:
 * - type: discriminator (human/agent), default 'human'
 * - avatar: custom avatar (emoji/URL), nullable — useful for all users
 * - description: user bio, nullable — useful for all users
 * - agentAccessLevel: external/internal/closed visibility tier, nullable — agent-only
 */
export class AddAgentColumnsToUser1770000000001 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const t = escape.tableName(tableName);

		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('type')} VARCHAR(50) NOT NULL DEFAULT 'human'`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('avatar')} VARCHAR(255) DEFAULT NULL`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('description')} VARCHAR(500) DEFAULT NULL`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('agentAccessLevel')} VARCHAR(20) DEFAULT NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const t = escape.tableName(tableName);

		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('agentAccessLevel')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('description')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('avatar')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('type')}`);
	}
}
