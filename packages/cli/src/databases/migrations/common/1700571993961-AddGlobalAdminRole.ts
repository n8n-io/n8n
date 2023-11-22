import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddGlobalAdminRole1700571993961 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('role');

		await runQuery(`INSERT INTO ${tableName} (name, scope) VALUES (:name, :scope)`, {
			name: 'admin',
			scope: 'global',
		});
	}

	async down({ escape, runQuery }: MigrationContext) {
		const roleTableName = escape.tableName('role');
		const userTableName = escape.tableName('user');

		const adminRoleIdResult: Array<{ id: number }> = await runQuery(
			`SELECT id FROM ${roleTableName} WHERE name = :name AND scope = :scope`,
			{
				name: 'admin',
				scope: 'global',
			},
		);

		const memberRoleIdResult: Array<{ id: number }> = await runQuery(
			`SELECT id FROM ${roleTableName} WHERE name = :name AND scope = :scope`,
			{
				name: 'member',
				scope: 'global',
			},
		);

		const adminRoleId = adminRoleIdResult[0]?.id;
		if (!adminRoleId) {
			// Couldn't find admin role. It's a bit odd but it means we don't
			// have anything to do.
			return;
		}

		const memberRoleId = memberRoleIdResult[0]?.id;
		if (!memberRoleId) {
			throw Error('Could not find global member role!');
		}

		await runQuery(
			`UPDATE ${userTableName} SET globalRoleId = :memberRoleId WHERE globalRoleId = :adminRoleId`,
			{
				memberRoleId,
				adminRoleId,
			},
		);

		await runQuery(`DELETE FROM ${roleTableName} WHERE name = :name AND scope = :scope`, {
			name: 'admin',
			scope: 'global',
		});
	}
}
