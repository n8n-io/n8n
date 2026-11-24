import type { Role } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class UniqueRoleNames1760020838000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('role');
		const displayNameColumn = escape.columnName('displayName');
		const slugColumn = escape.columnName('slug');
		const createdAtColumn = escape.columnName('createdAt');
		const allRoles: Array<Pick<Role, 'slug' | 'displayName'>> = await runQuery(
			`SELECT ${slugColumn}, ${displayNameColumn} FROM ${tableName} ORDER BY ${displayNameColumn}, ${createdAtColumn} ASC`,
		);

		// Group roles by displayName in memory
		const groupedByName = new Map<string, Array<Pick<Role, 'slug' | 'displayName'>>>();

		for (const role of allRoles) {
			const existing = groupedByName.get(role.displayName) || [];
			existing.push(role);
			groupedByName.set(role.displayName, existing);
		}

		for (const [_, roles] of groupedByName.entries()) {
			if (roles.length > 1) {
				const duplicates = roles.slice(1);
				let index = 2;
				for (const role of duplicates.values()) {
					let newDisplayName = `${role.displayName} ${index}`;
					while (allRoles.some((r) => r.displayName === newDisplayName)) {
						index++;
						newDisplayName = `${role.displayName} ${index}`;
					}
					await runQuery(
						`UPDATE ${tableName} SET ${displayNameColumn} = :displayName WHERE ${slugColumn} = :slug`,
						{
							displayName: newDisplayName,
							slug: role.slug,
						},
					);
					index++;
				}
			}
		}

		const indexName = escape.indexName('UniqueRoleDisplayName');
		await runQuery(`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${displayNameColumn})`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const indexName = escape.indexName('UniqueRoleDisplayName');
		await runQuery(`DROP INDEX ${indexName}`);
	}
}
