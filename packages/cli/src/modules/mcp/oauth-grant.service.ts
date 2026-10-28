import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Service } from '@n8n/di';

import type { OAuthGrantContext } from './database/oauth-grant-context';
import { OAuthGrantRepository } from './database/repositories/oauth-grant.repository';

@Service()
export class OAuthGrantService {
	constructor(private readonly grantRepository: OAuthGrantRepository) {}

	async runInTransaction<T>(
		work: (ctx: OAuthGrantContext) => Promise<T>,
		ctx?: OAuthGrantContext,
	): Promise<T> {
		return await this.grantRepository.runInTransaction(work, ctx);
	}

	async runForActiveUser<T>(
		userId: string,
		work: (ctx: OAuthGrantContext) => Promise<T>,
		ctx?: OAuthGrantContext,
	): Promise<T> {
		return await this.runInTransaction(async (trx) => {
			const user = await this.grantRepository.lockUserForGrant(userId, trx);
			if (!user || user.disabled) throw new InvalidGrantError('Invalid authorization grant');
			return await work(trx);
		}, ctx);
	}
}
