import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration
 */

export class LinkRoleToProjectRelationTable1753953244168 implements ReversibleMigration {
	async up({ schemaBuilder: { addForeignKey }, escape, dbType, runQuery }: MigrationContext) {
		const tableName = escape.tableName('role');
		const projectRelationTableName = escape.tableName('project_relation');
		const slugColumn = escape.columnName('slug');
		const roleColumn = escape.columnName('role');
		const roleTypeColumn = escape.columnName('roleType');
		const systemRoleColumn = escape.columnName('systemRole');

		const isPostgresOrSqlite = dbType === 'postgresdb' || dbType === 'sqlite';
		const query = isPostgresOrSqlite
			? `INSERT INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole) ON CONFLICT DO NOTHING`
			: `INSERT IGNORE INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`;

		// Make sure that the global roles that we need exist
		for (const role of [
			'project:personalOwner',
			'project:admin',
			'project:editor',
			'project:viewer',
		]) {
			await runQuery(query, {
				slug: role,
				roleType: 'project',
				systemRole: true,
			});
		}

		// Fallback to 'project:viewer' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${projectRelationTableName} SET ${roleColumn} = 'project:viewer' WHERE NOT EXISTS (SELECT 1 FROM ${tableName} WHERE ${slugColumn} = ${roleColumn})`,
		);

		await addForeignKey('project_relation', 'role', ['role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey } }: MigrationContext) {
		await dropForeignKey('project_relation', 'role', ['role', 'slug']);
	}
}
