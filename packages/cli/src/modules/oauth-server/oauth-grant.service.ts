import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { OAuthGrantRepository } from './database/repositories/oauth-grant.repository';

@Service()
export class OAuthGrantService {
	constructor(
		private readonly txRunner: TransactionRunner,
		private readonly grantRepository: OAuthGrantRepository,
	) {}

	async runForActiveUser<T>(
		userId: string,
		work: (ctx: OperationContext) => Promise<T>,
		ctx: OperationContext = {},
	): Promise<T> {
		return await this.txRunner.run(ctx, async (ctx) => {
			const user = await this.grantRepository.lockUserForGrant(userId, ctx);
			if (!user || user.disabled) throw new InvalidGrantError('Invalid authorization grant');
			return await work(ctx);
		});
	}
}
