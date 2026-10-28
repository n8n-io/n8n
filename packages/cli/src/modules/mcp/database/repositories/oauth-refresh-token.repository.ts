import { Service } from '@n8n/di';
import { DataSource, MoreThanOrEqual, Repository } from '@n8n/typeorm';

import { RefreshToken } from '../entities/oauth-refresh-token.entity';
import { managerForGrant, type OAuthGrantContext } from '../oauth-grant-context';

@Service()
export class RefreshTokenRepository extends Repository<RefreshToken> {
	constructor(dataSource: DataSource) {
		super(RefreshToken, dataSource.manager);
	}

	async insertToken(
		token: Pick<RefreshToken, 'token' | 'clientId' | 'userId' | 'expiresAt'>,
		ctx: OAuthGrantContext,
	): Promise<void> {
		await managerForGrant(ctx, this.manager).insert(RefreshToken, token);
	}

	async findByToken(
		token: string,
		clientId: string,
		ctx: OAuthGrantContext,
	): Promise<RefreshToken | null> {
		return await managerForGrant(ctx, this.manager).findOne(RefreshToken, {
			where: { token, clientId },
		});
	}

	async deleteValidByToken(
		token: string,
		clientId: string,
		now: number,
		ctx: OAuthGrantContext,
	): Promise<boolean> {
		const result = await managerForGrant(ctx, this.manager).delete(RefreshToken, {
			token,
			clientId,
			expiresAt: MoreThanOrEqual(now),
		});
		return (result.affected ?? 0) > 0;
	}
}
