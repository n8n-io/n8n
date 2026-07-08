import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { UserConsent } from '../entities/oauth-user-consent.entity';

@Service()
export class UserConsentRepository extends Repository<UserConsent> {
	constructor(dataSource: DataSource) {
		super(UserConsent, dataSource.manager);
	}

	/**
	 * Find all consents for a user with client information
	 */
	async findByUserWithClient(userId: string): Promise<UserConsent[]> {
		return await this.find({
			where: { userId },
			relations: ['client'],
			order: { grantedAt: 'DESC' },
		});
	}

	/**
	 * Find all consents across users with client and owner information
	 */
	async findAllWithClientAndUser(): Promise<UserConsent[]> {
		return await this.find({
			relations: ['client', 'user'],
			order: { grantedAt: 'DESC' },
		});
	}
}
