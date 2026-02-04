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
			where: { isGlobal: true },
			relations: { shared: true },
		});
	}

	/**
	 * Checks if the scopes allow read-only access to global credentials.
	 * Global credentials can be accessed with credential:read scope only.
	 */
	hasGlobalReadOnlyAccess(scopes: Scope[]): boolean {
		return scopes.length === 1 && scopes[0] === 'credential:read';
	}

	/**
	 * Finds a global credential by ID if it exists.
	 */
	async findGlobalCredentialById(
		credentialId: string,
		relations?: { shared: { project: boolean } },
	): Promise<CredentialsEntity | null> {
		return await this.credentialsRepository.findOne({
			where: {
				id: credentialId,
				isGlobal: true,
			},
			relations,
		});
	}

	async findCredentialById(credentialId: string): Promise<CredentialsEntity | null> {
		return await this.credentialsRepository.findOne({ where: { id: credentialId } });
	}

	/**
	 * Merges global credentials with the provided credentials list,
	 * deduplicating based on credential ID.
	 */
	private mergeAndDeduplicateCredentials<T extends { id: string }>(
		credentials: T[],
		globalCredentials: CredentialsEntity[],
		mapGlobalCredential: (cred: CredentialsEntity) => T | null,
	): T[] {
		const credentialIds = new Set(credentials.map((c) => c.id));
		const newGlobalCreds = globalCredentials
			.filter((gc) => !credentialIds.has(gc.id))
			.map(mapGlobalCredential)
			.filter((mapped): mapped is T => mapped !== null);

		return [...credentials, ...newGlobalCreds];
	}

	/**
	 * Find all credentials that the user has access to taking the scopes into
	 * account.
	 *
	 * This also returns `credentials.shared` which is useful for constructing
	 * all scopes the user has for the credential using `RoleService.addScopes`.
	 **/
	async findCredentialsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<CredentialsEntity> = { isGlobal: false };

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

		// Include global credentials only if the user has read-only access
		if (this.hasGlobalReadOnlyAccess(scopes)) {
			const globalCredentials = await this.fetchGlobalCredentials();
			return [...credentials, ...globalCredentials];
		}

		return credentials;
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(
		credentialsId: string,
		user: User,
		scopes: Scope[],
	): Promise<CredentialsEntity | null> {
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
					shared: { project: true },
				},
			},
		});

		if (sharedCredential) {
			return sharedCredential.credentials;
		}

		// Check for global credentials with read-only access
		if (this.hasGlobalReadOnlyAccess(scopes)) {
			return await this.findGlobalCredentialById(credentialsId, {
				shared: { project: true },
			});
		}

		return null;
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

		let sharedCredentialsList = sharedCredential.map((sc) => ({
			...sc.credentials,
			projectId: sc.projectId,
		}));

		// Include global credentials if flag is set
		if (options?.includeGlobalCredentials) {
			const globalCredentials = await this.fetchGlobalCredentials(trx);
			sharedCredentialsList = this.mergeAndDeduplicateCredentials(
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
