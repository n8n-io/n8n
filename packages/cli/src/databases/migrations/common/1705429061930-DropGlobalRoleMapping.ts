import type { MigrationContext, ReversibleMigration } from '@db/types';

export class DropGlobalRoleMapping1705429061930 implements ReversibleMigration {
	async up({
		dbType,
		escape,
		runQuery,
		schemaBuilder: { addColumns, addNotNull, column, dropColumns, dropForeignKey },
		tablePrefix,
	}: MigrationContext) {
		await addColumns('user', [column('role').text]);

		const roleTable = escape.tableName('role');
		const userTable = escape.tableName('user');
		const subQuery = `
			SELECT r.name as role, u.id as user_id
			FROM ${userTable} u
			LEFT JOIN ${roleTable} r
			ON u.${escape.columnName('globalRoleId')} = r.id and r.scope = :scope`;
		const query = ['mariadb', 'mysqldb'].includes(dbType)
			? `UPDATE ${userTable}, (${subQuery}) as mapping
					SET ${userTable}.role = mapping.role
					WHERE ${userTable}.id = mapping.user_id`
			: `UPDATE ${userTable}
					SET role = mapping.role
					FROM (${subQuery}) as mapping
					WHERE ${userTable}.id = mapping.user_id`;
		await runQuery(query, { scope: 'global' });

		await dropForeignKey(
			'user',
			'globalRoleId',
			['role', 'id'],
			`FK_${tablePrefix}f0609be844f9200ff4365b1bb3d`,
		);
		await dropColumns('user', ['globalRoleId']);
		await addNotNull('user', 'role');
	}

	async down({
		dbType,
		escape,
		runQuery,
		schemaBuilder: { addColumns, addForeignKey, addNotNull, dropColumns, column },
		tablePrefix,
	}: MigrationContext) {
		await addColumns('user', [column('globalRoleId').int]);
		await addForeignKey(
			'user',
			'globalRoleId',
			['role', 'id'],
			`FK_${tablePrefix}f0609be844f9200ff4365b1bb3d`,
		);

		const roleTable = escape.tableName('role');
		const userTable = escape.tableName('user');
		const subQuery = `
			SELECT r.id as role_id, u.id as user_id
			FROM ${userTable} u
			LEFT JOIN ${roleTable} r
			ON u.role = r.name and r.scope = :scope`;
		const query = ['mariadb', 'mysqldb'].includes(dbType)
			? `UPDATE ${userTable}, (${subQuery}) as mapping
				SET ${userTable}.${escape.columnName('globalRoleId')} = mapping.role_id
				WHERE ${userTable}.id = mapping.user_id`
			: `UPDATE ${userTable}
				SET ${escape.columnName('globalRoleId')} = mapping.role_id
				FROM (${subQuery}) as mapping
				WHERE ${userTable}.id = mapping.user_id`;
		await runQuery(query, { scope: 'global' });

		await addNotNull('user', 'globalRoleId');
		await dropColumns('user', ['role']);
	}
}
