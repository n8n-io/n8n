import { AbstractRepository, EntityRepository } from 'typeorm';
import { Role, RoleNames, RoleScopes } from '../entities/Role';

@EntityRepository(Role)
export class RoleRepository extends AbstractRepository<Role> {
	async findOne(name: RoleNames, scope: RoleScopes): Promise<Role | undefined> {
		return this.repository.findOne({ name, scope });
	}

	async findOneOrFail(name: RoleNames, scope: RoleScopes): Promise<Role> {
		return this.repository.findOneOrFail({ name, scope });
	}

	async clear() {
		return this.repository.clear();
	}
}
