import { Service } from '@n8n/di';

import { ServiceAccountUsage } from '@/services/service-account-usage.contracts';

import { AgentRepository } from './repositories/agent.repository';

/**
 * Tells core which agent acts as a service account. This module registers it on
 * `ServiceAccountUsageProxy` on init.
 */
@Service()
export class AgentServiceAccountUsage extends ServiceAccountUsage {
	constructor(private readonly agentRepository: AgentRepository) {
		super();
	}

	async findAgent(serviceAccountId: string) {
		return await this.agentRepository.findByIdentityId(serviceAccountId);
	}
}
