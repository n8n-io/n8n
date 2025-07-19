import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration
 */

export class LinkGlobalRoleToUserTable1750252139168 implements ReversibleMigration {
	async up({ schemaBuilder: { addForeignKey }, escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('global_role');
		const userTableName = escape.tableName('user');

		// Make sure that the global roles that we need exist
		try {
			await runQuery(`INSERT INTO ${tableName} (slug, systemRole) VALUES (:slug, :systemRole)`, {
				slug: 'global:owner',
				systemRole: true,
			});
		} catch (error) {
			// Ignore if the role already exists
		}
		try {
			await runQuery(`INSERT INTO ${tableName} (slug, systemRole) VALUES (:slug, :systemRole)`, {
				slug: 'global:admin',
				systemRole: true,
			});
		} catch (error) {
			// Ignore if the role already exists
		}
		try {
			await runQuery(`INSERT INTO ${tableName} (slug, systemRole) VALUES (:slug, :systemRole)`, {
				slug: 'global:member',
				systemRole: true,
			});
		} catch (error) {
			// Ignore if the role already exists
		}

		// Fallback to 'global:member' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${userTableName} SET role = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM ${tableName} WHERE slug = role)`,
		);

		await addForeignKey('user', 'role', ['global_role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey } }: MigrationContext) {
		await dropForeignKey('user', 'role', ['global_role', 'slug']);
	}
}
