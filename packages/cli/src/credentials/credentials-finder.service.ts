import type { CredentialsEntity, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { CredentialSharingRole, ProjectRole, Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

@Service()
export class CredentialsFinderService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Find all credentials that the user has access to taking the scopes into
	 * account.
	 *
	 * This also returns `credentials.project` for access to project information.
	 **/
	async findCredentialsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);
			where = {
				...where,
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		return await this.credentialsRepository.find({
			where,
			relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
		});
	}

	/** Get a credential if it has been accessible to a user */
	async findCredentialForUser(credentialsId: string, user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = { id: credentialsId };

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);
			where = {
				...where,
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const credential = await this.credentialsRepository.findOne({
			where,
			relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
		});

		return credential;
	}

	/** Get all credentials accessible to a user */
	async findAllCredentialsForUser(user: User, scopes: Scope[], trx?: EntityManager) {
		let where: FindOptionsWhere<CredentialsEntity> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);
			where = {
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const em = trx ?? this.credentialsRepository.manager;
		const credentials = await em.find(this.credentialsRepository.target, {
			where,
			relations: ['project'],
		});

		return credentials.map((c) => ({ ...c, projectId: c.projectId }));
	}

	async getCredentialIdsByUserAndRole(
		userIds: string[],
		options:
			| { scopes: Scope[] }
			| { projectRoles: ProjectRole[]; credentialRoles: CredentialSharingRole[] },
		trx?: EntityManager,
	) {
		const projectRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;

		const em = trx ?? this.credentialsRepository.manager;
		const credentials = await em.find(this.credentialsRepository.target, {
			where: {
				project: {
					projectRelations: {
						userId: In(userIds),
						role: In(projectRoles),
					},
				},
			},
			select: ['id'],
		});

		return credentials.map((c) => c.id);
	}
}
