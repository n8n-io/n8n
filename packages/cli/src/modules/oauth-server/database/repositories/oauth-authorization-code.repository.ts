import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, MoreThan } from '@n8n/typeorm';

import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';

@Service()
export class AuthorizationCodeRepository extends BaseRepository<AuthorizationCode> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AuthorizationCode, dataSource.manager, transactionRunner);
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
			| 'resource'
			| 'scope'
			| 'expiresAt'
			| 'used'
		>,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).insert(AuthorizationCode, code);
	}

	async consumeCode(code: string, ctx: OperationContext): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AuthorizationCode,
			{ code, used: false, expiresAt: MoreThan(Date.now()) },
			{ used: true },
		);
		return (result.affected ?? 0) > 0;
	}
}
