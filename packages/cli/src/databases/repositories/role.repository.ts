import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import type { RoleNames, RoleScopes } from '../entities/Role';
import { Role } from '../entities/Role';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}

	async findRole(scope: RoleScopes, name: RoleNames): Promise<Role | null> {
		return this.findOne({ where: { scope, name } });
	}

	async findRoleOrFail(scope: RoleScopes, name: RoleNames): Promise<Role> {
		return this.findOneOrFail({ where: { scope, name } });
	}
}
