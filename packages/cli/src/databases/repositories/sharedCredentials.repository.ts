import { Service } from 'typedi';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import { type CredentialSharingRole, SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import { ProjectRepository } from './project.repository';
import { RoleService } from '@/services/role.service';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(
		dataSource: DataSource,
		private readonly projectRepository: ProjectRepository,
		private readonly roleService: RoleService,
	) {
		super(SharedCredentials, dataSource.manager);
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(credentialsId: string, user: User) {
		let where: FindOptionsWhere<SharedCredentials> = { credentialsId };

		if (!user.hasGlobalScope('credential:read')) {
			const projectRoles = this.roleService.rolesWithScope('project', ['credential:read']);
			const credentialRoles = this.roleService.rolesWithScope('credential', ['credential:read']);
			where = {
				...where,
				role: In(credentialRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedCredential = await this.findOne({
			relations: ['credentials'],
			where,
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

	// TODO: needs test
	// FIXME: this should use the personal project instead of the deprecatedUserId
	async makeOwnerOfAllCredentials(user: User) {
		return await this.update(
			{ deprecatedUserId: Not(user.id), role: 'credential:owner' },
			{ deprecatedUserId: user.id },
		);
	}

	/** Get the IDs of all credentials owned by a user */
	async getOwnedCredentialIds(userIds: string[]) {
		return await this.getCredentialIdsByUserAndRole(userIds, ['credential:owner']);
	}

	/** Get the IDs of all credentials owned by or shared with a user */
	// FIXME: deduplicate this with `findCredentialForUser`
	async getAccessibleCredentialIds(userIds: string[]) {
		const projectRoles = this.roleService.rolesWithScope('project', ['credential:read']);
		const credentialRoles = this.roleService.rolesWithScope('credential', ['credential:read']);
		const projects = await this.projectRepository.find({
			where: {
				projectRelations: {
					role: In(projectRoles),
					userId: In(userIds),
				},
			},
		});

		const projectIds = projects.map((p) => p.id);

		const result = await this.find({
			where: {
				role: In(credentialRoles),
				project: In(projectIds),
			},
		});

		return result.map((sc) => sc.credentialsId);
	}

	private async getCredentialIdsByUserAndRole(userIds: string[], roles: CredentialSharingRole[]) {
		// TODO: get all projects the user is allowed to see
		const projects = await this.projectRepository.getPersonalProjectForUsers(userIds);
		const projectIds = projects.map((p) => p.id);

		const sharings = await this.find({
			where: {
				projectId: In(projectIds),
				role: In(roles),
			},
		});
		return sharings.map((s) => s.credentialsId);
	}

	async deleteByIds(transaction: EntityManager, sharedCredentialsIds: string[], user?: User) {
		return await transaction.delete(SharedCredentials, {
			// FIXME: figure out under what circumstance the deletion should happen with regards to projects
			deprecatedUser: user,
			// role: 'credential:owner',
			// project: {
			// 	projectRelations: {
			// 		role: 'project:personalOwner',
			// 		userId: user.id,
			// 	},
			// },
			credentialsId: In(sharedCredentialsIds),
		} satisfies FindOptionsWhere<SharedCredentials>);
	}
}
