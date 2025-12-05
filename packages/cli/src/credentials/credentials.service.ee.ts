import type { CredentialsEntity, User } from '@n8n/db';
import { Project, SharedCredentials, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type EntityManager } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TransferCredentialError } from '@/errors/response-errors/transfer-credential.error';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

import { CredentialsFinderService } from './credentials-finder.service';
import { CredentialsService } from './credentials.service';

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly roleService: RoleService,
	) {}

	async shareWithProjects(
		user: User,
		credentialId: string,
		shareWithIds: string[],
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.sharedCredentialsRepository.manager;
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

	async getOne(user: User, credentialId: string, includeDecryptedData: boolean) {
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
				)
			: null;

		if (credential) {
			// Decrypt the data if we found the credential with the `credential:update`
			// scope.
			decryptedData = this.credentialsService.decrypt(credential);
		} else {
			// Otherwise try to find them with only the `credential:read` scope. In
			// that case we return them without the decrypted data.
			credential = await this.credentialsFinderService.findCredentialForUser(credentialId, user, [
				'credential:read',
			]);
		}

		if (!credential) {
			throw new NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}

		credential = this.ownershipService.addOwnedByAndSharedWith(credential);

		const { data: _, ...rest } = credential;

		if (decryptedData) {
			// We never want to expose the oauthTokenData to the frontend, but it
			// expects it to check if the credential is already connected.
			if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...rest };
		}

		return { ...rest };
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

		await this.sharedCredentialsRepository.manager.transaction(async (trx) => {
			// 6. transfer the credential
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
		});
	}
}
