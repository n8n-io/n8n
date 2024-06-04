import { In, type EntityManager } from '@n8n/typeorm';
import type { User } from '@db/entities/User';
import { CredentialsService } from './credentials.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { Service } from 'typedi';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { OwnershipService } from '@/services/ownership.service';
import { Project } from '@/databases/entities/Project';
import { ProjectService } from '@/services/project.service';
import { TransferCredentialError } from '@/errors/response-errors/transfer-credential.error';
import { SharedCredentials } from '@/databases/entities/SharedCredentials';

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
	) {}

	async shareWithProjects(
		credential: CredentialsEntity,
		shareWithIds: string[],
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.sharedCredentialsRepository.manager;

		const projects = await em.find(Project, {
			where: { id: In(shareWithIds), type: 'personal' },
		});

		const newSharedCredentials = projects
			// We filter by role === 'project:personalOwner' above and there should
			// always only be one owner.
			.map((project) =>
				this.sharedCredentialsRepository.create({
					credentialsId: credential.id,
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
				await this.sharedCredentialsRepository.findCredentialForUser(
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
			decryptedData = this.credentialsService.redact(
				this.credentialsService.decrypt(credential),
				credential,
			);
		} else {
			// Otherwise try to find them with only the `credential:read` scope. In
			// that case we return them without the decrypted data.
			credential = await this.sharedCredentialsRepository.findCredentialForUser(
				credentialId,
				user,
				['credential:read'],
			);
		}

		if (!credential) {
			throw new NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}

		credential = this.ownershipService.addOwnedByAndSharedWith(credential);

		const { data: _, ...rest } = credential;

		if (decryptedData) {
			return { data: decryptedData, ...rest };
		}

		return { ...rest };
	}

	async transferOne(user: User, credentialId: string, destinationProjectId: string) {
		// 1. get credential
		const credential = await this.sharedCredentialsRepository.findCredentialForUser(
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
		if (sourceProject.type !== 'team' && sourceProject.type !== 'personal') {
			throw new TransferCredentialError(
				'You can only transfer credentials out of personal or team projects.',
			);
		}
		if (destinationProject.type !== 'team') {
			throw new TransferCredentialError('You can only transfer credentials into team projects.');
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
