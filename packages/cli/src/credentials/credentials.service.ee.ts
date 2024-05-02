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

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
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
}
