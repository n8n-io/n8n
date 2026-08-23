import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
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
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AccessToken, dataSource.manager, transactionRunner);
	}

	async insertToken(token: NewAccessToken, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).insert(AccessToken, token);
	}
}
