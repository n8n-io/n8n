import { Service } from 'typedi';
import { DataSource, In, Repository } from 'typeorm';
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
		return this.find({
			relations: ['credentials', 'role', 'user'],
			where: {
				credentialsId: In(credentialIds),
			},
		});
	}
}
