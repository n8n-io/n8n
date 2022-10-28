import { EntityRepository } from 'typeorm';
import { Role, RoleNames, RoleScopes } from '../entities/Role';
import { BaseRepository } from './BaseRepository';

@EntityRepository(Role)
export class RoleRepository extends BaseRepository<Role> {
	async findOne(name: RoleNames, scope: RoleScopes): Promise<Role | undefined> {
		return this.repository.findOne({ name, scope });
	}

	async findOneOrFail(name: RoleNames, scope: RoleScopes): Promise<Role> {
		return this.repository.findOneOrFail({ name, scope });
	}
}
