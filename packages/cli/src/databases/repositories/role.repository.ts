import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import type { RoleNames, RoleScopes } from '../entities/Role';
import { Role } from '../entities/Role';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}

	async findGlobalOwnerRole(): Promise<Role | null> {
		return this.findRole('global', 'owner');
	}

	async findGlobalOwnerRoleOrFail(): Promise<Role> {
		return this.findRoleOrFail('global', 'owner');
	}

	async findGlobalMemberRole(): Promise<Role | null> {
		return this.findRole('global', 'member');
	}

	async findGlobalMemberRoleOrFail(): Promise<Role> {
		return this.findRoleOrFail('global', 'member');
	}

	async findWorkflowOwnerRole(): Promise<Role | null> {
		return this.findRole('workflow', 'owner');
	}

	async findWorkflowOwnerRoleOrFail(): Promise<Role> {
		return this.findRoleOrFail('workflow', 'owner');
	}

	async findWorkflowEditorRoleOrFail(): Promise<Role> {
		return this.findRoleOrFail('workflow', 'editor');
	}

	async findCredentialOwnerRole(): Promise<Role | null> {
		return this.findRole('credential', 'owner');
	}

	async findCredentialOwnerRoleOrFail(): Promise<Role> {
		return this.findRoleOrFail('credential', 'owner');
	}

	async findCredentialUserRole(): Promise<Role | null> {
		return this.findRole('credential', 'user');
	}

	async findRole(scope: RoleScopes, name: RoleNames): Promise<Role | null> {
		return this.findOne({ where: { scope, name } });
	}

	async findRoleOrFail(scope: RoleScopes, name: RoleNames): Promise<Role> {
		return this.findOneOrFail({ where: { scope, name } });
	}
}
