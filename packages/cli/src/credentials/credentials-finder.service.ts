import type { SharedCredentials, User } from '@n8n/db';
import { CredentialsEntity, CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
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
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Fetches global credentials from the database.
	 */
	private async fetchGlobalCredentials(trx?: EntityManager): Promise<CredentialsEntity[]> {
		const em = trx ?? this.credentialsRepository.manager;
		return await em.find(CredentialsEntity, {
			where: { isAvailableForAllUsers: true },
			relations: { shared: true },
		});
	}

	/**
	 * Merges global credentials with the provided credentials list,
	 * deduplicating based on credential ID.
	 */
	private mergeAndDeduplicateCredentials<T extends { id: string }>(
		credentials: T[],
		globalCredentials: CredentialsEntity[],
		mapGlobalCredential: (cred: CredentialsEntity) => T | null,
	): void {
		const credentialMap = new Map(credentials.map((c) => [c.id, c]));
		for (const globalCred of globalCredentials) {
			if (!credentialMap.has(globalCred.id)) {
				const mapped = mapGlobalCredential(globalCred);
				if (mapped) {
					credentials.push(mapped);
				}
			}
		}
	}

	/**
	 * Find all credentials that the user has access to taking the scopes into
	 * account.
	 *
	 * This also returns `credentials.shared` which is useful for constructing
	 * all scopes the user has for the credential using `RoleService.addScopes`.
	 **/
	async findCredentialsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const [projectRoles, credentialRoles] = await Promise.all([
				this.roleService.rolesWithScope('project', scopes),
				this.roleService.rolesWithScope('credential', scopes),
			]);
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

		const credentials = await this.credentialsRepository.find({
			where,
			relations: { shared: true },
		});

		// Also include global credentials
		const globalCredentials = await this.fetchGlobalCredentials();
		this.mergeAndDeduplicateCredentials(credentials, globalCredentials, (cred) => cred);

		return credentials;
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(credentialsId: string, user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<SharedCredentials> = { credentialsId };

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const [projectRoles, credentialRoles] = await Promise.all([
				this.roleService.rolesWithScope('project', scopes),
				this.roleService.rolesWithScope('credential', scopes),
			]);
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
	async findAllCredentialsForUser(
		user: User,
		scopes: Scope[],
		trx?: EntityManager,
		options?: { includeGlobalCredentials?: boolean },
	) {
		let where: FindOptionsWhere<SharedCredentials> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const [projectRoles, credentialRoles] = await Promise.all([
				this.roleService.rolesWithScope('project', scopes),
				this.roleService.rolesWithScope('credential', scopes),
			]);
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

		const sharedCredentialsList = sharedCredential.map((sc) => ({
			...sc.credentials,
			projectId: sc.projectId,
		}));

		// Include global credentials if flag is set
		if (options?.includeGlobalCredentials) {
			const globalCredentials = await this.fetchGlobalCredentials(trx);
			this.mergeAndDeduplicateCredentials(
				sharedCredentialsList,
				globalCredentials,
				(globalCred) => {
					// For global credentials, use the owner's project ID
					const ownerSharing = globalCred.shared?.find((s) => s.role === 'credential:owner');
					const projectId = ownerSharing?.projectId;
					if (projectId) {
						return { ...globalCred, projectId };
					}
					// Skip credentials without a valid project ID
					return null;
				},
			);
		}

		return sharedCredentialsList;
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
		const credentialRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('credential', options.scopes)
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
