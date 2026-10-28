import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AccessToken } from '../entities/oauth-access-token.entity';
import { managerForGrant, type OAuthGrantContext } from '../oauth-grant-context';

@Service()
export class AccessTokenRepository extends Repository<AccessToken> {
	constructor(dataSource: DataSource) {
		super(AccessToken, dataSource.manager);
	}

	async insertToken(
		token: Pick<AccessToken, 'token' | 'clientId' | 'userId'>,
		ctx: OAuthGrantContext,
	): Promise<void> {
		await managerForGrant(ctx, this.manager).insert(AccessToken, token);
	}
}
