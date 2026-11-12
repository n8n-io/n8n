import { AgentsConfig } from '@n8n/config';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { ServiceAccountService } from '@/services/service-account.service';

import type { ProjectAgent } from './entities/agent.entity';

/** Links a project agent to the service account that acts for it. */
@Service()
export class AgentServiceAccountService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly serviceAccountService: ServiceAccountService,
	) {}

	/**
	 * Creates a service account with a personal project for a new agent and sets
	 * `agent.identityId`. Call it in the transaction that inserts the agent,
	 * so a failed insert leaves no account behind.
	 */
	async assignToNewAgent(agent: ProjectAgent, ctx: OperationContext): Promise<void> {
		if (!this.agentsConfig.serviceAccountsEnabled) return;

		const { serviceAccount } = await this.serviceAccountService.create(agent.name, ctx);
		agent.identityId = serviceAccount.id;
	}
}
