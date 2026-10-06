import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In } from '@n8n/typeorm';
import { BaseRepository, type OperationContext, Role, TransactionRunner, User } from '@n8n/db';

import { DynamicCredentialUserEntry } from '../entities/dynamic-credential-user-entry';

@Service()
export class DynamicCredentialUserEntryRepository extends BaseRepository<DynamicCredentialUserEntry> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(DynamicCredentialUserEntry, dataSource.manager, transactionRunner);
	}

	async findPairsForUsers(
		userIds: string[],
		credentialId: string | undefined,
		ctx: OperationContext,
	): Promise<Array<{ credentialId: string; userId: string }>> {
		return await this.managerFor(ctx).find(DynamicCredentialUserEntry, {
			select: ['credentialId', 'userId'],
			where: { userId: In(userIds), ...(credentialId ? { credentialId } : {}) },
		});
	}

	async findUsersWithRoleScopes(userIds: string[], ctx: OperationContext): Promise<User[]> {
		return await this.managerFor(ctx).find(User, {
			where: { id: In(userIds) },
			relations: { role: { scopes: true } },
		});
	}

	async findRolesWithScopes(ctx: OperationContext): Promise<Role[]> {
		return await this.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}

	async deleteByPairs(
		pairs: Array<{ credentialId: string; userId: string }>,
		em: EntityManager,
	): Promise<void> {
		if (pairs.length === 0) return;

		const whereClauses = pairs.map((_, i) => `(credentialId = :cid${i} AND userId = :uid${i})`);
		const params = Object.fromEntries(
			pairs.flatMap(({ credentialId, userId }, i) => [
				[`cid${i}`, credentialId],
				[`uid${i}`, userId],
			]),
		);

		await em
			.createQueryBuilder()
			.delete()
			.from(DynamicCredentialUserEntry)
			.where(whereClauses.join(' OR '), params)
			.execute();
	}

	async deletePairsInContext(
		pairs: Array<{ credentialId: string; userId: string }>,
		ctx: OperationContext,
	): Promise<void> {
		if (pairs.length === 0) return;
		const whereClauses = pairs.map((_, i) => `(credentialId = :cid${i} AND userId = :uid${i})`);
		const params = Object.fromEntries(
			pairs.flatMap(({ credentialId, userId }, i) => [
				[`cid${i}`, credentialId],
				[`uid${i}`, userId],
			]),
		);
		await this.managerFor(ctx)
			.createQueryBuilder()
			.delete()
			.from(DynamicCredentialUserEntry)
			.where(whereClauses.join(' OR '), params)
			.execute();
	}
}
