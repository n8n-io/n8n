import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * PROTOTYPE (workspaces): access options for a workspace.
 * - `project.isPublic`: anyone on the instance can join the workspace.
 * - `project.cascadeMembers`: workspace members get the same role on every child project.
 * - `project_relation.inheritedFromId`: the workspace that granted a cascaded relation.
 *
 * Plain `ALTER TABLE ADD COLUMN` keeps SQLite from recreating the tables.
 */
export class AddWorkspaceAccessOptions1790862446675 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const project = escape.tableName('project');
		const relation = escape.tableName('project_relation');
		await runQuery(
			`ALTER TABLE ${project} ADD COLUMN ${escape.columnName('isPublic')} BOOLEAN NOT NULL DEFAULT TRUE`,
		);
		await runQuery(
			`ALTER TABLE ${project} ADD COLUMN ${escape.columnName('cascadeMembers')} BOOLEAN NOT NULL DEFAULT FALSE`,
		);
		await runQuery(
			`ALTER TABLE ${relation} ADD COLUMN ${escape.columnName('inheritedFromId')} VARCHAR(36)`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const project = escape.tableName('project');
		const relation = escape.tableName('project_relation');
		await runQuery(`ALTER TABLE ${relation} DROP COLUMN ${escape.columnName('inheritedFromId')}`);
		await runQuery(`ALTER TABLE ${project} DROP COLUMN ${escape.columnName('cascadeMembers')}`);
		await runQuery(`ALTER TABLE ${project} DROP COLUMN ${escape.columnName('isPublic')}`);
	}
}
