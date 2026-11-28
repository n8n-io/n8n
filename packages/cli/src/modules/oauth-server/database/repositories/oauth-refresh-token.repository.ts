import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, MoreThanOrEqual } from '@n8n/typeorm';

import { RefreshToken } from '../entities/oauth-refresh-token.entity';

type NewRefreshToken = {
	token: string;
	clientId: string;
	userId: string;
	expiresAt: number;
	scope: string[];
	resource: string;
};

@Service()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(RefreshToken, dataSource.manager, transactionRunner);
	}

	async findByToken(
		token: string,
		clientId: string,
		ctx: OperationContext,
	): Promise<RefreshToken | null> {
		return await this.managerFor(ctx).findOne(RefreshToken, { where: { token, clientId } });
	}

	/** Delete a still-valid (unexpired at `now`) refresh token. Returns the rows affected. */
	async deleteValidByToken(
		token: string,
		clientId: string,
		now: number,
		ctx: OperationContext,
	): Promise<number> {
		const result = await this.managerFor(ctx).delete(RefreshToken, {
			token,
			clientId,
			expiresAt: MoreThanOrEqual(now),
		});
		return result.affected ?? 0;
	}

	/** Deletes the tokens of one user for one resource, on all clients. Returns the rows affected. */
	async deleteByUserAndResource(
		userId: string,
		resource: string,
		ctx: OperationContext,
	): Promise<number> {
		const result = await this.managerFor(ctx).delete(RefreshToken, { userId, resource });
		return result.affected ?? 0;
	}

	/** Deletes the tokens of all users for one resource. Returns the rows affected. */
	async deleteByResource(resource: string, ctx: OperationContext): Promise<number> {
		const result = await this.managerFor(ctx).delete(RefreshToken, { resource });
		return result.affected ?? 0;
	}

	async insertToken(token: NewRefreshToken, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).insert(RefreshToken, token);
	}
}
