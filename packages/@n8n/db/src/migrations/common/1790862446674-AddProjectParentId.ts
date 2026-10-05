import type { MigrationContext, ReversibleMigration } from '../migration-types';

const FOREIGN_KEY_NAME = 'FK_project_parentId';

/**
 * PROTOTYPE (workspaces): a project can belong to a workspace, which is itself
 * a `project` row. The startup bootstrap in the workspaces module fills it.
 */
export class AddProjectParentId1790862446674 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			'project',
			[column('parentId').varchar(36).comment('ID of the workspace that contains the project')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey('project', 'parentId', ['project', 'id'], FOREIGN_KEY_NAME, 'SET NULL');
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey('project', 'parentId', ['project', 'id'], FOREIGN_KEY_NAME);
		await dropColumns('project', ['parentId'], { recreatesOnSqlite: true });
	}
}
