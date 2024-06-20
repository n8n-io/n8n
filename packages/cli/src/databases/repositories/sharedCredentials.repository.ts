import { Service } from 'typedi';
import type { EntityManager, FindOptionsRelations, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import { type CredentialSharingRole, SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import { RoleService } from '@/services/role.service';
import type { Scope } from '@n8n/permissions';
import type { Project } from '../entities/Project';
import type { ProjectRole } from '../entities/ProjectRelation';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(
		dataSource: DataSource,
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

	async findByCredentialIds(credentialIds: string[], role: CredentialSharingRole) {
		return await this.find({
			relations: { credentials: true, project: { projectRelations: { user: true } } },
			where: {
				credentialsId: In(credentialIds),
				role,
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

	async makeOwner(credentialIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.upsert(
			SharedCredentials,
			credentialIds.map(
				(credentialsId) =>
					({
						projectId,
						credentialsId,
						role: 'credential:owner',
					}) as const,
			),
			['projectId', 'credentialsId'],
		);
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

	async deleteByIds(sharedCredentialsIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.delete(SharedCredentials, {
			projectId,
			credentialsId: In(sharedCredentialsIds),
		});
	}

	async getFilteredAccessibleCredentials(
		projectIds: string[],
		credentialsIds: string[],
	): Promise<string[]> {
		return (
			await this.find({
				where: {
					projectId: In(projectIds),
					credentialsId: In(credentialsIds),
				},
				select: ['credentialsId'],
			})
		).map((s) => s.credentialsId);
	}

	async findCredentialOwningProject(credentialsId: string) {
		return (
			await this.findOne({
				where: { credentialsId, role: 'credential:owner' },
				relations: { project: true },
			})
		)?.project;
	}
}
