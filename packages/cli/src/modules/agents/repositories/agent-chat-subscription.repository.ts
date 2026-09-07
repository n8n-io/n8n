import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentChatSubscription } from '../entities/agent-chat-subscription.entity';

export interface AgentChatSubscriptionScope {
	agentId: string;
	integrationType: string;
	credentialId: string;
}

@Service()
export class AgentChatSubscriptionRepository extends Repository<AgentChatSubscription> {
	constructor(dataSource: DataSource) {
		super(AgentChatSubscription, dataSource.manager);
	}

	async subscribe(scope: AgentChatSubscriptionScope, threadId: string): Promise<void> {
		await this.createQueryBuilder()
			.insert()
			.into(AgentChatSubscription)
			.values({ ...scope, threadId })
			.orIgnore()
			.execute();
	}

	async unsubscribe(scope: AgentChatSubscriptionScope, threadId: string): Promise<void> {
		await this.delete({ ...scope, threadId });
	}

	async deleteForConnection(scope: AgentChatSubscriptionScope): Promise<void> {
		await this.delete(scope);
	}

	async isSubscribed(scope: AgentChatSubscriptionScope, threadId: string): Promise<boolean> {
		return await this.existsBy({ ...scope, threadId });
	}

	async listThreadIdsForConnection(scope: AgentChatSubscriptionScope): Promise<string[]> {
		const rows = await this.find({
			select: { threadId: true },
			where: scope,
			order: { createdAt: 'ASC' },
		});
		return rows.map((row) => row.threadId);
	}
}
