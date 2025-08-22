import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration removes the old 'role' column from the 'user' table
 * and ensures that all users have a valid role set in the 'roleSlug' column.
 * It also ensures that the 'roleSlug' column is correctly populated with the
 * values from the 'role' column before dropping it.
 * This is a reversible migration, allowing the role column to be restored if needed.
 */
export class RemoveOldRoleColumn1750252139170 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns }, escape, runQuery }: MigrationContext) {
		const roleTableName = escape.tableName('role');
		const userTableName = escape.tableName('user');
		const slugColumn = escape.columnName('slug');
		const roleColumn = escape.columnName('role');
		const roleSlugColumn = escape.columnName('roleSlug');

		// Fallback to 'global:member' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = 'global:member', ${roleColumn} = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM ${roleTableName} WHERE ${slugColumn} = ${roleColumn})`,
		);

		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = ${roleColumn} WHERE ${roleColumn} != ${roleSlugColumn}`,
		);

		await dropColumns('user', ['role']);
	}

	async down({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
		const userTableName = escape.tableName('user');
		const roleColumn = escape.columnName('role');
		const roleSlugColumn = escape.columnName('roleSlug');

		await addColumns('user', [column('role').varchar(128).default("'global:member'").notNull]);

		await runQuery(
			`UPDATE ${userTableName} SET ${roleColumn} = ${roleSlugColumn} WHERE ${roleSlugColumn} != ${roleColumn}`,
		);

		// Fallback to 'global:member' for users that do not have a correct role set
		await runQuery(
			`UPDATE ${userTableName} SET ${roleColumn} = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM role WHERE slug = ${roleColumn})`,
		);
	}
}
