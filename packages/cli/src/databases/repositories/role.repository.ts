import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import type { RoleNames, RoleScopes } from '../entities/Role';
import { Role } from '../entities/Role';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}

	async findRole(scope: RoleScopes, name: RoleNames) {
		return this.findOne({ where: { scope, name } });
	}

	/**
	 * Counts the number of users in each role, e.g. `{ admin: 2, member: 6, owner: 1 }`
	 */
	async countUsersByRole() {
		type Row = { role_name: string; count: number };

		const rows: Row[] = await this.createQueryBuilder('role')
			.select('role.name')
			.addSelect('COUNT(user.id)', 'count')
			.innerJoin('user', 'user', 'role.id = user.globalRoleId')
			.groupBy('role.name')
			.getRawMany();

		return rows.reduce<Record<string, number>>((acc, item) => {
			acc[item.role_name] = item.count;
			return acc;
		}, {});
	}
}
