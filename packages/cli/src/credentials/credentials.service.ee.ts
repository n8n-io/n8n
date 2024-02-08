import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { type CredentialsGetSharedOptions } from './credentials.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { Service } from 'typedi';

@Service()
export class EnterpriseCredentialsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
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

		// Omit user from where if the requesting user has relevant
		// global credential permissions. This allows the user to
		// access credentials they don't own.
		if (!options.allowGlobalScope || !user.hasGlobalScope(options.globalScope)) {
			where.userId = user.id;
		}

		return await this.sharedCredentialsRepository.findOne({
			where,
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

		const newSharedCredentials = users
			.filter((user) => !user.isPending)
			.map((user) =>
				this.sharedCredentialsRepository.create({
					credentialsId: credential.id,
					userId: user.id,
					role: 'credential:user',
				}),
			);

		return await transaction.save(newSharedCredentials);
	}
}
