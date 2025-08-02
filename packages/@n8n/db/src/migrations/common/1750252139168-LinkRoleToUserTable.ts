import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration
 */

export class LinkRoleToUserTable1750252139168 implements ReversibleMigration {
	async up({
		schemaBuilder: { addForeignKey, addColumns, column },
		escape,
		dbType,
		runQuery,
	}: MigrationContext) {
		const tableName = escape.tableName('role');
		const userTableName = escape.tableName('user');
		const slugColumn = escape.columnName('slug');
		const roleColumn = escape.columnName('role');
		const roleSlugColumn = escape.columnName('roleSlug');
		const roleTypeColumn = escape.columnName('roleType');
		const systemRoleColumn = escape.columnName('systemRole');

		const isPostgresOrSqlite = dbType === 'postgresdb' || dbType === 'sqlite';
		const query = isPostgresOrSqlite
			? `INSERT INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole) ON CONFLICT DO NOTHING`
			: `INSERT IGNORE INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`;

		// Make sure that the global roles that we need exist
		for (const role of ['global:owner', 'global:admin', 'global:member']) {
			await runQuery(query, {
				slug: role,
				roleType: 'global',
				systemRole: true,
			});
		}

		await addColumns('user', [column('roleSlug').varchar(128).default("'global:member'").notNull]);

		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = ${roleColumn} WHERE ${roleColumn} != ${roleSlugColumn}`,
		);

		// Fallback to 'global:member' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM ${tableName} WHERE ${slugColumn} = ${roleSlugColumn})`,
		);

		await addForeignKey('user', 'roleSlug', ['role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey, dropColumns } }: MigrationContext) {
		await dropForeignKey('user', 'roleSlug', ['role', 'slug']);
		await dropColumns('user', ['roleSlug']);
	}
}
