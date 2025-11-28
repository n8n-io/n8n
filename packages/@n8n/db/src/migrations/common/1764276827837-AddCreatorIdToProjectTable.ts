import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	project: 'project',
	projectRelation: 'project_relation',
} as const;

const FOREIGN_KEY_NAME = 'projects_creatorId_foreign';

export class AddCreatorIdToProjectTable1764276827837 implements ReversibleMigration {
	async up({
		escape,
		schemaBuilder: { addColumns, addForeignKey, column },
		queryRunner,
	}: MigrationContext) {
		await addColumns(table.project, [
			column('creatorId').uuid.comment('ID of the user who created the project'),
		]);

		await addForeignKey(table.project, 'creatorId', ['user', 'id'], FOREIGN_KEY_NAME, 'SET NULL');

		// Populate creatorId for existing personal projects.
		// We can only do this for personal projects as for team projects
		// we don't have a reliable way of knowing who the creator was.
		await queryRunner.query(`
			UPDATE ${escape.tableName(table.project)} AS project
			SET ${escape.columnName('creatorId')} = (
				SELECT pr.${escape.columnName('userId')}
				FROM ${escape.tableName(table.projectRelation)} AS pr
				WHERE pr.${escape.columnName('projectId')} = project.${escape.columnName('id')}
					AND pr.${escape.columnName('role')} = 'project:personalOwner'
				LIMIT 1
			)
			WHERE project.${escape.columnName('type')} = 'personal'
				AND project.${escape.columnName('creatorId')} IS NULL;`);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(table.project, 'creatorId', ['user', 'id'], FOREIGN_KEY_NAME);
		await dropColumns(table.project, ['creatorId']);
	}
}
