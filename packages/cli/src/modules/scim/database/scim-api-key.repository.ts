import { ApiKey, BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TOKEN_PURPOSES } from '@/services/token-purposes';

/**
 * SCIM provisioning keys are ordinary API keys reserved by their audience.
 * The queries live here so the service stays free of TypeORM, and so
 * replacing a key stays one unit of work.
 *
 * Every query is pinned to the SCIM audience. The audience is not a parameter
 * on purpose: it is what scopes this repository to SCIM, so a caller must not
 * be able to reach another kind of key through it.
 */
@Service()
export class ScimApiKeyRepository extends BaseRepository<ApiKey> {
	private readonly audience = TOKEN_PURPOSES.scimApiKey;

	/**
	 * Names the row for anyone reading the table. Never shown in the UI.
	 *
	 * Keep this constant. `api_key` is unique on (userId, label), so a fixed
	 * label is what stops a user ending up with two live SCIM keys: a second
	 * rotation racing the first is rejected by that index instead of quietly
	 * inserting a second valid token. Per-key labels would remove the only
	 * thing enforcing one key per user.
	 */
	private readonly label = 'SCIM Provisioning API Key';

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ApiKey, dataSource.manager, transactionRunner);
	}

	async findByUserId(userId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(ApiKey, {
			where: { userId, audience: this.audience },
		});
	}

	async findByKey(apiKey: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(ApiKey, {
			where: { apiKey, audience: this.audience },
			relations: ['user'],
		});
	}

	/**
	 * Replace the user's SCIM key.
	 *
	 * A concurrent rotation is rejected by the (userId, label) index rather
	 * than being allowed through, so the user never holds two valid tokens.
	 * The caller sees a failure and retries. Making that a clean 409, and
	 * handling the case where the user already has a public API key of this
	 * name, both need a unique index on (userId) for this audience, so they
	 * wait for the PR that carries a migration.
	 */
	async replaceForUser(userId: string, apiKey: string, ctx: OperationContext) {
		const { audience, label } = this;

		return await this.runInTransaction(ctx, async (tx) => {
			await tx.delete(ApiKey, { userId, audience });
			await tx.insert(ApiKey, this.create({ userId, apiKey, audience, scopes: [], label }));

			return await tx.findOneByOrFail(ApiKey, { apiKey });
		});
	}

	async deleteAllForUser(userId: string, ctx: OperationContext) {
		await this.managerFor(ctx).delete(ApiKey, { userId, audience: this.audience });
	}
}
