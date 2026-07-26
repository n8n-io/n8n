import { BaseRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AccessToken } from '../entities/oauth-access-token.entity';

type NewAccessToken = {
	token: string;
	clientId: string;
	userId: string;
};

@Service()
export class AccessTokenRepository extends BaseRepository<AccessToken> {
	constructor(dataSource: DataSource) {
		super(AccessToken, dataSource.manager);
	}

	async insertToken(token: NewAccessToken, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).insert(AccessToken, token);
	}
}
