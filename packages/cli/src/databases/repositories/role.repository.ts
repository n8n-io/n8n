import { Service } from 'typedi';
import { DataSource, In, Repository } from 'typeorm';
import type { RoleName, RoleScope } from '../entities/Role';
import { Role } from '../entities/Role';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}

	async findRole(scope: RoleScope, name: RoleName) {
		return await this.findOne({ where: { scope, name } });
	}

	async getIdsInScopeWorkflowByNames(roleNames: RoleName[]) {
		return await this.find({
			select: ['id'],
			where: { name: In(roleNames), scope: 'workflow' },
		}).then((role) => role.map(({ id }) => id));
	}
}
