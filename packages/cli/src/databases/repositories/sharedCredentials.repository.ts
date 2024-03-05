import { Service } from 'typedi';
import type { EntityManager, FindOptionsRelations, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import { type CredentialSharingRole, SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import { ProjectRepository } from './project.repository';
import { RoleService } from '@/services/role.service';
import type { ProjectRole } from '../entities/ProjectRelation';
import type { Scope } from '@n8n/permissions';

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
	async findCredentialForUser(
		credentialsId: string,
		user: User,
		scopes: Scope[],
		_relations?: FindOptionsRelations<SharedCredentials>,
	) {
		let where: FindOptionsWhere<SharedCredentials> = { credentialsId };

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const credentialRoles = this.roleService.rolesWithScope('credential', scopes);
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
			where,
			// TODO: write a small relations merger and use that one here
			relations: {
				credentials: {
					shared: { project: { projectRelations: { user: true } } },
				},
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
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);

		return await this.update(
			{ projectId: Not(personalProject.id), role: 'credential:owner' },
			{
				projectId: personalProject.id,
				// TODO: Remove this in the future when the userId property is removed
				// from the SharedWorkflow.
				// Right now it has to stay here, otherwise the cascading deletes
				// started from the cli user management reset command will delete this
				// shared workflow too.
				// See: src/commands/user-management/reset.ts
				deprecatedUserId: user.id,
			},
		);
	}

	/** Get the IDs of all credentials owned by a user */
	async getOwnedCredentialIds(userIds: string[]) {
		return await this.getCredentialIdsByUserAndRole(
			userIds,
			['project:personalOwner'],
			'credential:owner',
		);
	}

	/** Get the IDs of all credentials owned by or shared with a user */
	async getAccessibleCredentialIds(userIds: string[]) {
		const projectRoles = this.roleService.rolesWithScope('project', ['credential:read']);
		const credentialRoles = this.roleService.rolesWithScope('credential', ['credential:read']);
		const projects = await this.projectRepository.find({
			select: { id: true },
			where: {
				projectRelations: {
					role: In(projectRoles),
					userId: In(userIds),
				},
			},
		});

		const projectIds = projects.map((p) => p.id);

		const result = await this.find({
			select: { credentialsId: true },
			where: {
				role: In(credentialRoles),
				project: In(projectIds),
			},
		});

		return result.map((sc) => sc.credentialsId);
	}

	private async getCredentialIdsByUserAndRole(
		userIds: string[],
		projectRole: ProjectRole[],
		credentialRole: CredentialSharingRole,
	) {
		const projects = await this.projectRepository.find({
			where: {
				projectRelations: {
					role: In(projectRole),
					userId: In(userIds),
				},
			},
		});
		const projectIds = projects.map((p) => p.id);

		const sharings = await this.find({
			where: {
				projectId: In(projectIds),
				role: credentialRole,
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
