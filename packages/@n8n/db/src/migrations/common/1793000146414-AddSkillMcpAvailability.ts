import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillMcpAvailability1793000146414 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('skill');
		const column = escape.columnName('availableToMCP');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} boolean NOT NULL DEFAULT false`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Whether a user has enabled this skill for MCP clients of the n8n MCP server. Scope and permissions still apply.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill')} DROP COLUMN ${escape.columnName('availableToMCP')}`,
		);
	}
}
