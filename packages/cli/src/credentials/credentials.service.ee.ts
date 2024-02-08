import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { type CredentialsGetSharedOptions } from './credentials.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { Service } from 'typedi';

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

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

	async getSharings(transaction: EntityManager, credentialId: string, relations = ['shared']) {
		const credential = await transaction.findOne(CredentialsEntity, {
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
}
