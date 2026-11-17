import type { CredentialConnectionStatus, CredentialTransferPreview } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	CredentialsEntity,
	Project,
	SharedCredentials,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { In, type EntityManager } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { NotFoundError } from '@n8n/errors';
import { TransferCredentialError } from '@/errors/response-errors/transfer-credential.error';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { hasCheckErrors, PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { RoleService, CredentialsFinderService, EventService } from '@n8n/backend-services';

import { CredentialConnectionStatusProxy } from './credential-connection-status-proxy';
import { CredentialsService } from './credentials.service';
import { validateAccessToReferencedSecretProviders } from './validation';

/** Why a credential never follows the owner that a package names. */
export type CredentialOwnerTransferExclusion = 'managed' | 'resolvable' | 'instance';

/**
 * Whether the owner of a credential can move to another project and keep every share.
 * - `allowed`: the move can run.
 * - `not-allowed`: the user lacks a right. The credential stays as it is.
 * - `excluded`: this kind of credential never moves.
 * - `not-needed`: the project already owns the credential.
 * - `not-found`: no credential has the id, or it has no owner.
 */
export type CredentialOwnerTransferCheck =
	| {
			status: 'allowed' | 'not-allowed';
			fromProjectId: string;
			isPlaceholder: boolean;
			type: string;
			name: string;
	  }
	| {
			status: 'excluded';
			reason: CredentialOwnerTransferExclusion;
			fromProjectId?: string;
			type: string;
			name: string;
	  }
	| { status: 'not-needed'; type: string; name: string }
	| { status: 'not-found' };

export type CredentialOwnerTransferResult =
	| { status: 'moved'; fromProjectId: string; isPlaceholder: boolean }
	| { status: 'not-allowed' | 'excluded' | 'not-needed' | 'not-found' };

/**
 * - `granted`: the project got access now.
 * - `already-usable`: the project already had access. Nothing was written.
 * - `forbidden`: the user may not share the credential.
 * - `unlicensed`: the instance has no sharing licence.
 * - `not-shareable`: no project credential has the id, or the project is not a team project.
 */
export type CredentialGrantStatus =
	| 'granted'
	| 'already-usable'
	| 'forbidden'
	| 'unlicensed'
	| 'not-shareable';

export type CredentialGrantCheck = Exclude<CredentialGrantStatus, 'granted'> | 'grantable';

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
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly eventService: EventService,
	) {}

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
		return await this.credentialsFinderService.findById(credentialId);
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
					// `credential:update` is its own gate: a see-only instance role never
					// holds it, so this decrypt branch is unreachable for one.
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
				// Detail-page metadata only — no `data` is returned on this branch, so
				// seeing a credential you are not a member of is enough.
				{ includeInstanceCredentials: true, visibilityOnly: true },
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

		credential = await this.ownershipService.addSharingWithAccountKinds(credential);

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

	/**
	 * What a move into `destinationProjectId` would restrict. Refuses what the move refuses for
	 * other reasons, so it never warns about a move that cannot happen.
	 */
	async previewTransfer(
		user: User,
		credentialId: string,
		destinationProjectId: string,
	): Promise<CredentialTransferPreview> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:move'],
		);
		NotFoundError.isDefinedAndNotNull(
			credential,
			`Could not find the credential with the id "${credentialId}". Make sure you have the permission to move it.`,
		);

		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create credentials in it.`,
		);

		await this.assertCanTransfer(user, credential, destinationProject);

		const decision = await this.policyEnforcementService.evaluateCredentialTransfer({
			credential: { id: credential.id, type: credential.type },
			targetProjectId: destinationProject.id,
		});

		return { restricted: decision.violations, checkFailed: hasCheckErrors(decision) };
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

		// 2. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create credentials in it.`,
		);

		// 3. checks
		await this.assertCanTransfer(user, credential, destinationProject);

		// 4. projects losing access — the move drops all their sharings
		const affectedProjectIds = [...new Set(credential.shared.map((s) => s.projectId))];

		await this.sharedCredentialsRepository.manager.transaction(async (trx) => {
			// 5. transfer the credential
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

			// 6. drop connections for members who lost access in the new project
			await this.connectionStatusProxy.cleanupOrphanedEntriesForProjects(
				credential.id,
				affectedProjectIds,
				trx,
			);
		});
	}

	/**
	 * Creates the empty, marked credential that stands in for a credential that an incomplete
	 * promotion Apply could not bring. Needs `credential:create` in `projectId`. Sharing the new
	 * placeholder with the other projects of the same Apply is part of its creation and needs no
	 * other right: the placeholder holds no values.
	 */
	async createPlaceholderCredential(
		opts: {
			id: string;
			name: string;
			type: string;
			projectId: string;
			shareWithProjectIds?: string[];
		},
		user: User,
	): Promise<CredentialsEntity> {
		const placeholder = await this.credentialsService.createStubCredential(
			{
				id: opts.id,
				name: opts.name,
				type: opts.type,
				projectId: opts.projectId,
				placeholder: true,
			},
			user,
		);

		const shareWithIds = [...new Set(opts.shareWithProjectIds ?? [])].filter(
			(projectId) => projectId !== opts.projectId,
		);
		if (shareWithIds.length > 0) {
			const projects = await this.sharedCredentialsRepository.manager.find(Project, {
				where: { id: In(shareWithIds), type: 'team' },
				select: ['id'],
			});
			await this.sharedCredentialsRepository.save(
				projects.map((project) =>
					this.sharedCredentialsRepository.create({
						credentialsId: placeholder.id,
						projectId: project.id,
						role: 'credential:user',
					}),
				),
			);
		}

		return placeholder;
	}

	/**
	 * Whether {@link transferKeepingShares} would move the credential. Writes nothing.
	 *
	 * A placeholder holds no secret of its owner, so it moves with `credential:create` in the
	 * destination only. Any other credential also needs `credential:move` on the credential:
	 * the move takes the edit, share and delete rights from the old owner.
	 *
	 * @param options.destinationPendingCreation The caller creates the destination project and
	 * becomes its admin, so the project has no scopes to look up yet.
	 */
	async checkTransferKeepingShares(
		user: User,
		credentialId: string,
		destinationProjectId: string,
		options: { destinationPendingCreation?: boolean } = {},
	): Promise<CredentialOwnerTransferCheck> {
		const credential = await this.credentialsFinderService.findById(credentialId, {
			includeSharedProject: true,
		});
		if (!credential) return { status: 'not-found' };

		const { type, name, isPlaceholder } = credential;
		const fromProjectId = credential.shared?.find(
			(sharing) => sharing.role === 'credential:owner',
		)?.projectId;
		if (fromProjectId === destinationProjectId) return { status: 'not-needed', type, name };

		const exclusion = ownerTransferExclusion(credential);
		if (exclusion) return { status: 'excluded', reason: exclusion, fromProjectId, type, name };
		if (fromProjectId === undefined) return { status: 'not-found' };

		const outcome = (status: 'allowed' | 'not-allowed'): CredentialOwnerTransferCheck => ({
			status,
			fromProjectId,
			isPlaceholder,
			type,
			name,
		});

		if (!options.destinationPendingCreation) {
			const destination = await this.projectService.getProjectWithScope(
				user,
				destinationProjectId,
				['credential:create'],
			);
			if (!destination || destination.type !== 'team') return outcome('not-allowed');
		}

		if (!isPlaceholder) {
			const movable = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				user,
				['credential:move'],
			);
			if (!movable) return outcome('not-allowed');
		}

		// The destination project needs access to every external secret provider it references.
		if (
			this.licenseState.isExternalSecretsLicensed() &&
			this.externalSecretsConfig.externalSecretsForProjects
		) {
			try {
				const decryptedData = await this.credentialsService.decrypt(credential, true);
				await validateAccessToReferencedSecretProviders(
					destinationProjectId,
					decryptedData,
					this.externalSecretsProviderAccessCheckService,
					'transfer',
				);
			} catch {
				return outcome('not-allowed');
			}
		}

		return outcome('allowed');
	}

	/**
	 * Moves the owner of a credential to `destinationProjectId` and keeps every share. The old
	 * owner project becomes a user of the credential, so nobody loses access. Unlike
	 * {@link transferOne}, which removes every share.
	 *
	 * The rights are those of {@link checkTransferKeepingShares}. A managed credential, an
	 * end-user credential and an instance credential never move. Without the rights the
	 * credential stays as it is and the result says so: this method does not throw for them.
	 */
	async transferKeepingShares(
		user: User,
		credentialId: string,
		destinationProjectId: string,
	): Promise<CredentialOwnerTransferResult> {
		const check = await this.checkTransferKeepingShares(user, credentialId, destinationProjectId);
		if (check.status !== 'allowed') return { status: check.status };

		const { fromProjectId, isPlaceholder } = check;
		await this.sharedCredentialsRepository.manager.transaction(async (trx) => {
			// The key of a sharing is the credential and the project, so each save replaces the
			// role of one project and touches no other share.
			await trx.save(
				trx.create(SharedCredentials, {
					credentialsId: credentialId,
					projectId: fromProjectId,
					role: 'credential:user',
				}),
			);
			await trx.save(
				trx.create(SharedCredentials, {
					credentialsId: credentialId,
					projectId: destinationProjectId,
					role: 'credential:owner',
				}),
			);
		});

		return { status: 'moved', fromProjectId, isPlaceholder };
	}

	/** Whether the user may update the credentials that a project owns. */
	async canUpdateCredentialsInProject(user: User, projectId: string): Promise<boolean> {
		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'credential:update',
		]);
		return project !== null;
	}

	/** Whether {@link grantProjectAccess} would give the project access. Writes nothing. */
	async checkProjectAccessGrant(
		user: User,
		credentialId: string,
		projectId: string,
	): Promise<CredentialGrantCheck> {
		const credential = await this.credentialsFinderService.findById(credentialId, {
			includeSharedProject: true,
		});
		if (!credential || credential.usageScope !== 'project') return 'not-shareable';
		if (credential.isGlobal || credential.shared?.some((s) => s.projectId === projectId)) {
			return 'already-usable';
		}

		const isTeamProject = await this.sharedCredentialsRepository.manager.exists(Project, {
			where: { id: projectId, type: 'team' },
		});
		if (!isTeamProject) return 'not-shareable';
		if (!this.licenseState.isSharingLicensed()) return 'unlicensed';

		const canShare = await userHasScopes(user, ['credential:share'], false, { credentialId });
		return canShare ? 'grantable' : 'forbidden';
	}

	/**
	 * Gives a team project use access to a credential, like a share in the editor. Needs the
	 * sharing licence and `credential:share` on the credential. A second call writes nothing,
	 * and no call ever removes a share.
	 */
	async grantProjectAccess(
		user: User,
		credentialId: string,
		projectId: string,
	): Promise<{ status: CredentialGrantStatus }> {
		const check = await this.checkProjectAccessGrant(user, credentialId, projectId);
		if (check !== 'grantable') return { status: check };

		const credential = await this.credentialsFinderService.findById(credentialId);
		if (!credential) return { status: 'not-shareable' };

		await this.sharedCredentialsRepository.save(
			this.sharedCredentialsRepository.create({
				credentialsId: credentialId,
				projectId,
				role: 'credential:user',
			}),
		);

		// The same event as a share in the editor, so the audit log holds the grant.
		this.eventService.emit('credentials-shared', {
			user,
			credentialType: credential.type,
			credentialId,
			userIdSharer: user.id,
			userIdsShareesAdded: [projectId],
			shareesRemoved: null,
		});

		return { status: 'granted' };
	}

	/** The move's refusals that are not policies. The preview runs them too. */
	private async assertCanTransfer(
		user: User,
		credential: CredentialsEntity,
		destinationProject: Project,
	): Promise<void> {
		const ownerSharing = credential.shared.find((s) => s.role === 'credential:owner');
		NotFoundError.isDefinedAndNotNull(
			ownerSharing,
			`Could not find owner for credential "${credential.id}"`,
		);

		if (ownerSharing.project.id === destinationProject.id) {
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

		// The destination project needs access to every external secret provider it references.
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
	}
}

function ownerTransferExclusion(
	credential: Pick<CredentialsEntity, 'isManaged' | 'isResolvable' | 'usageScope'>,
): CredentialOwnerTransferExclusion | undefined {
	if (credential.isManaged) return 'managed';
	if (credential.isResolvable) return 'resolvable';
	if (credential.usageScope === 'instance') return 'instance';
	return undefined;
}
