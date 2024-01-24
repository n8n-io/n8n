import { Service } from 'typedi';
import type { EntityManager } from 'typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(dataSource: DataSource) {
		super(SharedCredentials, dataSource.manager);
	}

	/** Get a credential if it has been shared with a user */
	async findCredentialForUser(credentialsId: string, user: User) {
		const sharedCredential = await this.findOne({
			relations: ['credentials'],
			where: {
				credentialsId,
				...(!user.hasGlobalScope('credential:read') ? { userId: user.id } : {}),
			},
		});
		if (!sharedCredential) return null;
		return sharedCredential.credentials;
	}

	async findByCredentialIds(credentialIds: string[]) {
		return await this.find({
			relations: ['credentials', 'user'],
			where: {
				credentialsId: In(credentialIds),
			},
		});
	}

	async makeOwnerOfAllCredentials(user: User) {
		return await this.update({ userId: Not(user.id), role: 'credential:owner' }, { user });
	}

	/**
	 * Get the IDs of all credentials owned by or shared with a user.
	 */
	async getAccessibleCredentials(userId: string) {
		const sharings = await this.find({
			where: {
				userId,
				role: In(['credential:owner', 'credential:user']),
			},
		});

		return sharings.map((s) => s.credentialsId);
	}

	async findOwnedSharings(userIds: string[]) {
		return await this.find({
			where: {
				userId: In(userIds),
				role: 'credential:owner',
			},
		});
	}

	async deleteByIds(transaction: EntityManager, sharedCredentialsIds: string[], user?: User) {
		return await transaction.delete(SharedCredentials, {
			user,
			credentialsId: In(sharedCredentialsIds),
		});
	}
}
