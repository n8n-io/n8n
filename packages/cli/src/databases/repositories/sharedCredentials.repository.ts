import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import { type CredentialSharingRole, SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import type { Scope } from '@n8n/permissions';
import type { ProjectRole } from '../entities/ProjectRelation';
import { RoleService } from '@/services/role.service';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(
		dataSource: DataSource,
		private readonly roleService: RoleService,
	) {
		super(SharedCredentials, dataSource.manager);
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(credentialsId: string, user: User) {
		const sharedCredential = await this.findOne({
			relations: ['credentials'],
			where: {
				credentialsId,
				...(!user.hasGlobalScope('credential:read') ? { userId: user.id } : {}),
			},
		});
		if (!sharedCredential) return null;
		return sharedCredential.credentials;
	}

	async findByCredentialIds(credentialIds: string[]) {
		return await this.find({
			relations: ['credentials', 'user'],
			where: {
				credentialsId: In(credentialIds),
			},
		});
	}

	async makeOwnerOfAllCredentials(user: User) {
		return await this.update({ userId: Not(user.id), role: 'credential:owner' }, { user });
	}

	/** Get the IDs of all credentials owned by a user */
	async getOwnedCredentialIds(userIds: string[]) {
		return await this.getCredentialIdsByUserAndRole(userIds, {
			credentialRoles: ['credential:owner'],
			projectRoles: ['project:personalOwner'],
		});
	}

	async getCredentialIdsByUserAndRole(
		userIds: string[],
		options:
			| { scopes: Scope[] }
			| { projectRoles: ProjectRole[]; credentialRoles: CredentialSharingRole[] },
	) {
		const projectRoles =
			'scopes' in options
				? this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;
		const credentialRoles =
			'scopes' in options
				? this.roleService.rolesWithScope('credential', options.scopes)
				: options.credentialRoles;

		const sharings = await this.find({
			where: {
				role: In(credentialRoles),
				project: {
					projectRelations: {
						userId: In(userIds),
						role: In(projectRoles),
					},
				},
			},
		});
		return sharings.map((s) => s.credentialsId);
	}

	async deleteByIds(transaction: EntityManager, sharedCredentialsIds: string[], user?: User) {
		return await transaction.delete(SharedCredentials, {
			user,
			credentialsId: In(sharedCredentialsIds),
		});
	}
}
