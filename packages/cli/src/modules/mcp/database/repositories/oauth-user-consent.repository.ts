import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { UserConsent } from '../entities/oauth-user-consent.entity';
import { managerForGrant, type OAuthGrantContext } from '../oauth-grant-context';

@Service()
export class UserConsentRepository extends Repository<UserConsent> {
	constructor(dataSource: DataSource) {
		super(UserConsent, dataSource.manager);
	}

	async saveGrant(userId: string, clientId: string, ctx: OAuthGrantContext): Promise<void> {
		await managerForGrant(ctx, this.manager).insert(UserConsent, {
			userId,
			clientId,
			grantedAt: Date.now(),
		});
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
}
