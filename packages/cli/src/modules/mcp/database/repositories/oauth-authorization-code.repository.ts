import { Service } from '@n8n/di';
import { DataSource, MoreThan, Repository } from '@n8n/typeorm';

import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';
import { managerForGrant, type OAuthGrantContext } from '../oauth-grant-context';

@Service()
export class AuthorizationCodeRepository extends Repository<AuthorizationCode> {
	constructor(dataSource: DataSource) {
		super(AuthorizationCode, dataSource.manager);
	}

	async insertCode(
		code: Pick<
			AuthorizationCode,
			| 'code'
			| 'clientId'
			| 'userId'
			| 'redirectUri'
			| 'codeChallenge'
			| 'codeChallengeMethod'
			| 'state'
			| 'expiresAt'
			| 'used'
		>,
		ctx?: OAuthGrantContext,
	): Promise<void> {
		await managerForGrant(ctx, this.manager).insert(AuthorizationCode, code);
	}

	async findCode(
		code: string,
		clientId: string,
		ctx?: OAuthGrantContext,
	): Promise<AuthorizationCode | null> {
		return await managerForGrant(ctx, this.manager).findOne(AuthorizationCode, {
			where: { code, clientId },
		});
	}

	async deleteCode(code: string, clientId: string, ctx?: OAuthGrantContext): Promise<void> {
		await managerForGrant(ctx, this.manager).delete(AuthorizationCode, { code, clientId });
	}

	async consumeCode(code: string, clientId: string, ctx?: OAuthGrantContext): Promise<boolean> {
		const result = await managerForGrant(ctx, this.manager).update(
			AuthorizationCode,
			{ code, clientId, used: false, expiresAt: MoreThan(Date.now()) },
			{ used: true },
		);
		return (result.affected ?? 0) > 0;
	}
}
