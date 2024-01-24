import { Container } from 'typedi';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { CredentialsService, type CredentialsGetSharedOptions } from './credentials.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { UserRepository } from '@/databases/repositories/user.repository';

export class EECredentialsService extends CredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
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
	static async getSharing(
		user: User,
		credentialId: string,
		options: CredentialsGetSharedOptions,
		relations: string[] = ['credentials'],
	): Promise<SharedCredentials | null> {
		const where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		// Omit user from where if the requesting user has relevant
		// global credential permissions. This allows the user to
		// access credentials they don't own.
		if (!options.allowGlobalScope || !user.hasGlobalScope(options.globalScope)) {
			where.userId = user.id;
		}

		return await Container.get(SharedCredentialsRepository).findOne({
			where,
			relations,
		});
	}

	static async getSharings(
		transaction: EntityManager,
		credentialId: string,
		relations = ['shared'],
	): Promise<SharedCredentials[]> {
		const credential = await transaction.findOne(CredentialsEntity, {
			where: { id: credentialId },
			relations,
		});
		return credential?.shared ?? [];
	}

	static async share(
		transaction: EntityManager,
		credential: CredentialsEntity,
		shareWithIds: string[],
	): Promise<SharedCredentials[]> {
		const users = await Container.get(UserRepository).getByIds(transaction, shareWithIds);

		const newSharedCredentials = users
			.filter((user) => !user.isPending)
			.map((user) =>
				Container.get(SharedCredentialsRepository).create({
					credentialsId: credential.id,
					userId: user.id,
					role: 'credential:user',
				}),
			);

		return await transaction.save(newSharedCredentials);
	}
}
