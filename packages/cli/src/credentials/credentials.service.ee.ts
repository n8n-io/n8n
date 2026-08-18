import type { CredentialConnectionStatus } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { CredentialsEntity as CredentialsEntityType, User } from '@n8n/db';
import {
	CredentialsEntity,
	Project,
	ProjectRelationRepository,
	SharedCredentials,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { In, type EntityManager } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TransferCredentialError } from '@/errors/response-errors/transfer-credential.error';
import { EventService } from '@/events/event.service';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';

import { CredentialConnectionStatusProxy } from './credential-connection-status-proxy';
import { CredentialsFinderService } from './credentials-finder.service';
import { CredentialsService } from './credentials.service';
import { validateAccessToReferencedSecretProviders } from './validation';

/** Projects to add to, and remove from, a credential's `credential:user` sharings. */
export type CredentialSharingDiff = {
	toShare: string[];
	toUnshare: string[];
};

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly roleService: RoleService,
		private readonly externalSecretsConfig: ExternalSecretsConfig,
		private readonly externalSecretsProviderAccessCheckService: SecretsProviderAccessCheckService,
		private readonly licenseState: LicenseState,
		private readonly connectionStatusProxy: CredentialConnectionStatusProxy,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly eventService: EventService,
		private readonly userManagementMailer: UserManagementMailer,
	) {}

	/**
	 * Diff a credential's current `credential:user` sharings against the requested set of
	 * project ids. Pure: callers can inspect the result to authorize each direction
	 * separately before any mutation happens.
	 */
	getSharedWithProjectsDiff(
		credential: CredentialsEntityType,
		shareWithIds: string[],
	): CredentialSharingDiff {
		const currentProjectIds = credential.shared
			.filter((sc) => sc.role === 'credential:user')
			.map((sc) => sc.projectId);

		return {
			toShare: utils.rightDiff([currentProjectIds, (id) => id], [shareWithIds, (id) => id]),
			toUnshare: utils.rightDiff([shareWithIds, (id) => id], [currentProjectIds, (id) => id]),
		};
	}

	/**
	 * Apply a sharing diff to a credential: verify the user holds the scope for each
	 * direction being changed, persist both directions in a single transaction, then
	 * emit the sharing event and notify the new sharees.
	 */
	async setSharedWithProjects(
		user: User,
		credential: CredentialsEntityType,
		{ toShare, toUnshare }: CredentialSharingDiff,
	) {
		const credentialId = credential.id;

		if (toShare.length > 0) {
			const canShare = await userHasScopes(user, ['credential:share'], false, { credentialId });
			if (!canShare) throw new ForbiddenError();
		}

		if (toUnshare.length > 0) {
			const canUnshare = await userHasScopes(user, ['credential:unshare'], false, { credentialId });
			if (!canUnshare) throw new ForbiddenError();
		}

		let amountRemoved: number | null = null;

		const { manager: dbManager } = this.sharedCredentialsRepository;
		await dbManager.transaction(async (trx) => {
			const deleteResult = await trx.delete(SharedCredentials, {
				credentialsId: credentialId,
				projectId: In(toUnshare),
			});
			await this.shareWithProjects(user, credentialId, toShare, trx);

			if (deleteResult.affected) {
				amountRemoved = deleteResult.affected;
				await this.connectionStatusProxy.cleanupOrphanedEntriesForProjects(
					credentialId,
					toUnshare,
					trx,
				);
			}
		});

		this.eventService.emit('credentials-shared', {
			user,
			credentialType: credential.type,
			credentialId,
			userIdSharer: user.id,
			userIdsShareesAdded: toShare,
			shareesRemoved: amountRemoved,
		});

		const projectsRelations = await this.projectRelationRepository.findBy({
			projectId: In(toShare),
			role: { slug: PROJECT_OWNER_ROLE_SLUG },
		});

		await this.userManagementMailer.notifyCredentialsShared({
			sharer: user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			credentialsName: credential.name,
		});
	}

	async shareWithProjects(
		user: User,
		credentialId: string,
		shareWithIds: string[],
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.sharedCredentialsRepository.manager;
		const canShare = await em.exists(CredentialsEntity, {
			where: { id: credentialId, usageScope: 'project' },
		});
		if (!canShare) throw new NotFoundError('Credential not found');

		const roles = await this.roleService.rolesWithScope('project', ['project:list']);

		let projects = await em.find(Project, {
			where: [
				{
					id: In(shareWithIds),
					type: 'team',
					// if user can see all projects, don't check project access
					// if they can't, find projects they can list
					...(hasGlobalScope(user, 'project:list')
						? {}
						: {
								projectRelations: {
									userId: user.id,
									role: In(roles),
								},
							}),
				},
				{
					id: In(shareWithIds),
					type: 'personal',
				},
			],
			relations: { sharedCredentials: true },
		});
		// filter out all projects that already own the credential
		projects = projects.filter(
			(p) =>
				!p.sharedCredentials.some(
					(psc) => psc.credentialsId === credentialId && psc.role === 'credential:owner',
				),
		);

		const newSharedCredentials = projects.map((project) =>
			this.sharedCredentialsRepository.create({
				credentialsId: credentialId,
				role: 'credential:user',
				projectId: project.id,
			}),
		);

		return await em.save(newSharedCredentials);
	}

	async getOne(credentialId: string) {
		return await this.credentialsFinderService.findCredentialById(credentialId);
	}

	async getOneForUser(user: User, credentialId: string, includeDecryptedData: boolean) {
		let credential: CredentialsEntity | null = null;
		let decryptedData: ICredentialDataDecryptedObject | null = null;

		credential = includeDecryptedData
			? // Try to get the credential with `credential:update` scope, which
				// are required for decrypting the data.
				await this.credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					// TODO: replace credential:update with credential:decrypt once it lands
					// see: https://n8nio.slack.com/archives/C062YRE7EG4/p1708531433206069?thread_ts=1708525972.054149&cid=C062YRE7EG4
					['credential:read', 'credential:update'],
					{ includeInstanceCredentials: true },
				)
			: null;

		if (credential) {
			// Decrypt the data if we found the credential with the `credential:update`
			// scope.
			decryptedData = await this.credentialsService.decrypt(credential);
		} else {
			// Otherwise try to find them with only the `credential:read` scope. In
			// that case we return them without the decrypted data.
			credential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				user,
				['credential:read'],
				{ includeInstanceCredentials: true },
			);

			// Connect-capable users of a private credential need the redacted blueprint
			// (secrets stay masked) so the UI can detect the OAuth type and render the
			// per-user connect flow, even without edit rights.
			if (
				includeDecryptedData &&
				credential?.isResolvable &&
				(await this.credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					['credential:connect'],
					{ includeInstanceCredentials: true },
				))
			) {
				decryptedData = await this.credentialsService.decrypt(credential);
			}
		}

		if (!credential) {
			throw new NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}

		credential = this.ownershipService.addOwnedByAndSharedWith(credential);

		const { data: _, ...rest } = credential;

		const enriched: typeof rest & CredentialConnectionStatus = rest;
		await this.credentialsService.populateConnectedByMe([enriched], user);

		if (credential.isResolvable) {
			enriched.connectedUserCount = await this.credentialsService.countConnectedUsers(
				credential.id,
			);
		}

		if (decryptedData) {
			// We never want to expose the oauthTokenData to the frontend, but it
			// expects it to check if the credential is already connected.
			if (credential.isResolvable) {
				// For resolvable credentials, the "connected" signal lives in the
				// per-user storage — mirror that into the existing oauthTokenData
				// flag the frontend banner already reads.
				if (enriched.connectedByMe) {
					decryptedData.oauthTokenData = true;
				} else {
					delete decryptedData.oauthTokenData;
				}
			} else if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...enriched };
		}

		return { ...enriched };
	}

	async transferOne(user: User, credentialId: string, destinationProjectId: string) {
		// 1. get credential
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:move'],
		);
		NotFoundError.isDefinedAndNotNull(
			credential,
			`Could not find the credential with the id "${credentialId}". Make sure you have the permission to move it.`,
		);

		// 2. get owner-sharing
		const ownerSharing = credential.shared.find((s) => s.role === 'credential:owner');
		NotFoundError.isDefinedAndNotNull(
			ownerSharing,
			`Could not find owner for credential "${credential.id}"`,
		);

		// 3. get source project
		const sourceProject = ownerSharing.project;

		// 4. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create credentials in it.`,
		);

		// 5. checks
		if (sourceProject.id === destinationProject.id) {
			throw new TransferCredentialError(
				"You can't transfer a credential into the project that's already owning it.",
			);
		}

		// Transferring an end-user credential into a project is equivalent to
		// creating one there: same createEndUser gate, no personal projects.
		if (credential.isResolvable) {
			this.credentialsService.ensureEndUserCredentialAllowedInProject(destinationProject);
			await this.credentialsService.ensureCanManageEndUserCredential(user, destinationProject.id);
		}

		// 6. validate that the destination project has access to all external secret providers
		if (
			this.licenseState.isExternalSecretsLicensed() &&
			this.externalSecretsConfig.externalSecretsForProjects
		) {
			const decryptedData = await this.credentialsService.decrypt(credential, true);
			await validateAccessToReferencedSecretProviders(
				destinationProject.id,
				decryptedData,
				this.externalSecretsProviderAccessCheckService,
				'transfer',
			);
		}

		// 7. projects losing access — the move drops all their sharings
		const affectedProjectIds = [...new Set(credential.shared.map((s) => s.projectId))];

		await this.sharedCredentialsRepository.manager.transaction(async (trx) => {
			// 8. transfer the credential
			// remove all sharings
			await trx.remove(credential.shared);

			// create new owner-sharing
			await trx.save(
				trx.create(SharedCredentials, {
					credentialsId: credential.id,
					projectId: destinationProject.id,
					role: 'credential:owner',
				}),
			);

			// 9. drop connections for members who lost access in the new project
			await this.connectionStatusProxy.cleanupOrphanedEntriesForProjects(
				credential.id,
				affectedProjectIds,
				trx,
			);
		});
	}
}
