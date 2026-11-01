import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentChatSubscription } from '../entities/agent-chat-subscription.entity';

import type { AgentChannelRef } from '../utils/agent-channel';

class AgentChatSubscriptionTable extends BaseRepository<AgentChatSubscription> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentChatSubscription, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentChatSubscriptionRepository {
	private readonly table: AgentChatSubscriptionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentChatSubscriptionTable(dataSource, transactionRunner);
	}

	async subscribe(scope: AgentChannelRef, threadId: string, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(AgentChatSubscription)
			.values({ ...scope, threadId })
			.orIgnore()
			.execute();
	}

	async unsubscribe(
		scope: AgentChannelRef,
		threadId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentChatSubscription, { ...scope, threadId });
	}

	async deleteForConnection(scope: AgentChannelRef, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentChatSubscription, scope);
	}

	async isSubscribed(
		scope: AgentChannelRef,
		threadId: string,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(AgentChatSubscription, { ...scope, threadId });
	}

	async listThreadIdsForConnection(
		scope: AgentChannelRef,
		ctx: OperationContext,
	): Promise<string[]> {
		const rows = await this.table.managerFor(ctx).find(AgentChatSubscription, {
			select: { threadId: true },
			where: scope,
			order: { createdAt: 'ASC' },
		});
		return rows.map((row) => row.threadId);
	}
}
