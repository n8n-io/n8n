import { In, type EntityManager, type FindOptionsWhere } from '@n8n/typeorm';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { CredentialsService } from './credentials.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { Service } from 'typedi';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { OwnershipService } from '@/services/ownership.service';
import type { Scope } from '@n8n/permissions';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { Project } from '@/databases/entities/Project';

export type CredentialsGetSharedOptions =
	| { allowGlobalScope: true; globalScope: Scope }
	| { allowGlobalScope: false };

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly ownershipService: OwnershipService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	/**
	 * Returns the credential if the user owns it. Otherwise not.
	 **/
	async isOwned(user: User, credentialId: string) {
		const sharing = await this.getSharing(user, credentialId, { allowGlobalScope: false }, [
			'credentials',
		]);

		if (!sharing || sharing.role !== 'credential:owner') return { ownsCredential: false };

		const { credentials: credential } = sharing;

		return { ownsCredential: true, credential };
	}

	/**
	 * Retrieve the sharing that matches a user and a credential.
	 */
	async getSharing(
		user: User,
		credentialId: string,
		options: CredentialsGetSharedOptions,
		relations: string[] = ['credentials'],
	) {
		const where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		const userHasGlobalAccess =
			options.allowGlobalScope && user.hasGlobalScope(options.globalScope);

		return await this.sharedCredentialsRepository.findOne({
			where: {
				...where,
				...(userHasGlobalAccess
					? // Omit user from where if the requesting user has relevant
					  // global credential permissions. This allows the user to
					  // access credentials they don't own.
					  null
					: {
							project: {
								projectRelations: {
									userId: user.id,
								},
							},
					  }),
			},
			relations,
		});
	}

	async getSharings(credentialId: string, relations = ['shared'], entityManager?: EntityManager) {
		const em = entityManager ?? this.credentialsRepository.manager;
		const credential = await em.findOne(CredentialsEntity, {
			where: { id: credentialId },
			relations,
		});

		return credential?.shared ?? [];
	}

	async share(transaction: EntityManager, credential: CredentialsEntity, shareWithIds: string[]) {
		const users = await this.userRepository.getByIds(transaction, shareWithIds);

		const newSharedCredentials = await Promise.all(
			users
				.filter((user) => !user.isPending)
				.map(async (user) => {
					const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
						user.id,
					);

					return this.sharedCredentialsRepository.create({
						credentialsId: credential.id,
						role: 'credential:user',
						project: personalProject,
						deprecatedUserId: user.id,
					});
				}),
		);

		return await transaction.save(newSharedCredentials);
	}

	async shareWithProjects(
		credential: CredentialsEntity,
		shareWithIds: string[],
		entityManager: EntityManager,
	) {
		const em = entityManager ?? this.sharedCredentialsRepository.manager;

		const projects = await em.find(Project, {
			select: { projectRelations: { userId: true } },
			where: { id: In(shareWithIds), projectRelations: { role: 'project:personalOwner' } },
			relations: { projectRelations: true },
		});

		const newSharedCredentials = projects.map((project) =>
			this.sharedCredentialsRepository.create({
				credentialsId: credential.id,
				role: 'credential:user',
				projectId: project.id,
				deprecatedUserId: project.projectRelations.find((pr) => pr.userId)?.userId,
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
