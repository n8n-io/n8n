import { PROJECT_ROLES, PROJECT_VIEWER_ROLE } from '../../constants';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration links the role table to the project relation table, by adding a new foreign key on the 'role' column
 * It also ensures that all project relations have a valid role set in the 'role' column.
 * The migration will insert the project roles that we need into the role table if they do not exist.
 */

export class LinkRoleToProjectRelationTable1753953244168 implements ReversibleMigration {
	async up({ schemaBuilder: { addForeignKey }, escape, dbType, runQuery }: MigrationContext) {
		const roleTableName = escape.tableName('role');
		const projectRelationTableName = escape.tableName('project_relation');
		const slugColumn = escape.columnName('slug');
		const roleColumn = escape.columnName('role');
		const roleTypeColumn = escape.columnName('roleType');
		const systemRoleColumn = escape.columnName('systemRole');

		const isPostgresOrSqlite = dbType === 'postgresdb' || dbType === 'sqlite';
		const query = isPostgresOrSqlite
			? `INSERT INTO ${roleTableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole) ON CONFLICT DO NOTHING`
			: `INSERT IGNORE INTO ${roleTableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`;

		// Make sure that the project roles that we need exist
		for (const role of Object.values(PROJECT_ROLES)) {
			await runQuery(query, {
				slug: role.slug,
				roleType: role.roleType,
				systemRole: role.systemRole,
			});
		}

		// Fallback to 'project:viewer' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${projectRelationTableName} SET ${roleColumn} = '${PROJECT_VIEWER_ROLE.slug}' WHERE NOT EXISTS (SELECT 1 FROM ${roleTableName} WHERE ${slugColumn} = ${roleColumn})`,
		);

		await addForeignKey('project_relation', 'role', ['role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey } }: MigrationContext) {
		await dropForeignKey('project_relation', 'role', ['role', 'slug']);
	}
}
