import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentChannelActivity } from '../entities/agent-channel-activity.entity';
import type { AgentChannelRef } from '../utils/agent-channel';

@Service()
export class AgentChannelActivityRepository extends Repository<AgentChannelActivity> {
	constructor(dataSource: DataSource) {
		super(AgentChannelActivity, dataSource.manager);
	}

	/** `updatedAt` is explicit because an upsert only overwrites the columns it is given. */
	async recordInbound(ref: AgentChannelRef, at: Date): Promise<void> {
		await this.upsert({ ...ref, lastInboundAt: at, updatedAt: at }, [
			'agentId',
			'integrationType',
			'credentialId',
		]);
	}

	async findByAgentId(agentId: string): Promise<AgentChannelActivity[]> {
		return await this.findBy({ agentId });
	}
}
