import type { ProjectRole } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type {
	SharedCredentials,
	CredentialSharingRole,
} from '@/databases/entities/shared-credentials';
import type { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { RoleService } from '@/services/role.service';

@Service()
export class CredentialsFinderService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly roleService: RoleService,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	/**
	 * Find all credentials that the user has access to taking the scopes into
	 * account.
	 *
	 * This also returns `credentials.shared` which is useful for constructing
	 * all scopes the user has for the credential using `RoleService.addScopes`.
	 **/
	async findCredentialsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = {};

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const credentialRoles = this.roleService.rolesWithScope('credential', scopes);
			where = {
				...where,
				shared: {
					role: In(credentialRoles),
					project: {
						projectRelations: {
							role: In(projectRoles),
							userId: user.id,
						},
					},
				},
			};
		}

		return await this.credentialsRepository.find({ where, relations: { shared: true } });
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(credentialsId: string, user: User, scopes: Scope[]) {
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

		const sharedCredential = await this.sharedCredentialsRepository.findOne({
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

	/** Get all credentials shared to a user */
	async findAllCredentialsForUser(user: User, scopes: Scope[], trx?: EntityManager) {
		let where: FindOptionsWhere<SharedCredentials> = {};

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const credentialRoles = this.roleService.rolesWithScope('credential', scopes);
			where = {
				role: In(credentialRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedCredential = await this.sharedCredentialsRepository.findCredentialsWithOptions(
			where,
			trx,
		);

		return sharedCredential.map((sc) => ({ ...sc.credentials, projectId: sc.projectId }));
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
				? this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;
		const credentialRoles =
			'scopes' in options
				? this.roleService.rolesWithScope('credential', options.scopes)
				: options.credentialRoles;

		const sharings = await this.sharedCredentialsRepository.findCredentialsByRoles(
			userIds,
			projectRoles,
			credentialRoles,
			trx,
		);

		return sharings.map((s) => s.credentialsId);
	}
}
