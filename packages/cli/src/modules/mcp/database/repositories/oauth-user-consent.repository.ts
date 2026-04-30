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

	async countByUserId(userId: string): Promise<number> {
		return await this.count({ where: { userId } });
	}

	/**
	 * Returns the client IDs this user has previously consented to whose
	 * client name matches `clientName`, excluding `excludeClientId`. Used to
	 * trace duplicate-client registrations on reconnect.
	 */
	async findClientIdsForUserByName(
		userId: string,
		clientName: string,
		excludeClientId: string,
	): Promise<string[]> {
		const rows = await this.createQueryBuilder('consent')
			.innerJoin('consent.client', 'client')
			.select('consent.clientId', 'clientId')
			.where('consent.userId = :userId', { userId })
			.andWhere('client.name = :clientName', { clientName })
			.andWhere('consent.clientId != :excludeClientId', { excludeClientId })
			.getRawMany<{ clientId: string }>();

		return rows.map((row) => row.clientId);
	}
}
