import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AuthIdentity } from '../entities';
import type { AuthProviderType } from '../entities/types-db';

@Service()
export class AuthIdentityRepository extends Repository<AuthIdentity> {
	constructor(dataSource: DataSource) {
		super(AuthIdentity, dataSource.manager);
	}

	/**
	 * Finds the identity of an external provider together with its user. SSO logins
	 * resolve the account by this identity before they fall back to the email.
	 * The user's role and identities are loaded because the entity hooks need them.
	 */
	async findByProviderIdWithUser(
		providerId: string,
		providerType: AuthProviderType,
	): Promise<AuthIdentity | null> {
		return await this.findOne({
			where: { providerId, providerType },
			relations: { user: { role: true, authIdentities: true } },
		});
	}
}
