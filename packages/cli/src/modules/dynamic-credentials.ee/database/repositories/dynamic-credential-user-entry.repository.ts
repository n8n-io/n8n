import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In } from '@n8n/typeorm';
import {
	BaseRepository,
	CredentialsEntity,
	type OperationContext,
	ProjectRelation,
	Role,
	SharedCredentials,
	TransactionRunner,
	User,
} from '@n8n/db';

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

	async findPairsWithCredentialAccess(
		pairs: Array<{ credentialId: string; userId: string }>,
		scope: string,
		credentialRoles: string[],
		ctx: OperationContext,
	): Promise<Array<{ credentialId: string; userId: string }>> {
		if (pairs.length === 0 || credentialRoles.length === 0) return [];
		const credentialIds = [...new Set(pairs.map(({ credentialId }) => credentialId))];
		const userIds = [...new Set(pairs.map(({ userId }) => userId))];
		const rows = await this.managerFor(ctx)
			.createQueryBuilder(SharedCredentials, 'sc')
			.select(['sc.credentialsId AS "credentialId"', 'pr.userId AS "userId"'])
			.distinct(true)
			.innerJoin(ProjectRelation, 'pr', 'pr.projectId = sc.projectId')
			.innerJoin('pr.role', 'pr_role')
			.innerJoin('pr_role.scopes', 'pr_scope')
			.where('sc.credentialsId IN (:...credentialIds)', { credentialIds })
			.andWhere('pr.userId IN (:...userIds)', { userIds })
			.andWhere('pr_scope.slug = :scope', { scope })
			.andWhere('sc.role IN (:...credentialRoles)', { credentialRoles })
			.getRawMany<{ credentialId: string; userId: string }>();
		const requested = new Set(pairs.map(({ credentialId, userId }) => `${credentialId}|${userId}`));
		return rows.filter(({ credentialId, userId }) => requested.has(`${credentialId}|${userId}`));
	}

	async findGloballyConnectableCredentialIds(
		credentialIds: string[],
		ctx: OperationContext,
	): Promise<string[]> {
		const credentials = await this.managerFor(ctx).find(CredentialsEntity, {
			where: { id: In(credentialIds), isGlobal: true, usageScope: 'project', isResolvable: true },
			select: ['id'],
		});
		return credentials.map(({ id }) => id);
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
