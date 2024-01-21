import { Service } from 'typedi';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { SharedCredentials } from '../entities/SharedCredentials';
import type { User } from '../entities/User';
import type { Role } from '../entities/Role';

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
			relations: ['credentials', 'role', 'user'],
			where: {
				credentialsId: In(credentialIds),
			},
		});
	}

	async makeOwnerOfAllCredentials(user: User, role: Role) {
		return await this.update({ userId: Not(user.id), roleId: role.id }, { user });
	}

	/**
	 * Get the IDs of all credentials owned by or shared with a user.
	 */
	async getAccessibleCredentials(userId: string) {
		const sharings = await this.find({
			relations: ['role'],
			where: {
				userId,
				role: { name: In(['owner', 'user']), scope: 'credential' },
			},
		});

		return sharings.map((s) => s.credentialsId);
	}

	async findSharings(userIds: string[], roleId?: string) {
		const where: FindOptionsWhere<SharedCredentials> = { userId: In(userIds) };

		// If credential sharing is not enabled, get only credentials owned by this user
		if (roleId) where.roleId = roleId;

		return await this.find({ where });
	}

	async deleteByIds(transaction: EntityManager, sharedCredentialsIds: string[], user?: User) {
		return await transaction.delete(SharedCredentials, {
			user,
			credentialsId: In(sharedCredentialsIds),
		});
	}
}
