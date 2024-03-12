import { Service } from 'typedi';
import type { EntityManager, FindOptionsRelations, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import { type CredentialSharingRole, SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import { RoleService } from '@/services/role.service';
import { ProjectRepository } from './project.repository';
import type { Scope } from '@n8n/permissions';
import type { Project } from '../entities/Project';
import type { ProjectRole } from '../entities/ProjectRelation';

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

	async makeOwnerOfAllCredentials(project: Project) {
		return await this.update(
			{
				projectId: Not(project.id),
				role: 'credential:owner',
			},
			{ project },
		);
	}

	/** Get the IDs of all credentials owned by a user */
	async getOwnedCredentialIds(userIds: string[]) {
		return await this.getCredentialIdsByUserAndRole(userIds, {
			credentialRoles: ['credential:owner'],
			projectRoles: ['project:personalOwner'],
		});
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

	async deleteByIds(transaction: EntityManager, sharedCredentialsIds: string[], project?: Project) {
		return await transaction.delete(SharedCredentials, {
			project,
			credentialsId: In(sharedCredentialsIds),
		});
	}
}
