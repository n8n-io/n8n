import { AgentsConfig } from '@n8n/config';
import { type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { ServiceAccountService } from '@/services/service-account.service';

import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

/** Rolls back the account of the main that lost the race to link an identity. */
class IdentityAlreadyLinkedError extends Error {}

/** Links an agent to the service account that acts for it. */
@Service()
export class AgentServiceAccountService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly serviceAccountService: ServiceAccountService,
		private readonly agentRepository: AgentRepository,
		private readonly transactionRunner: TransactionRunner,
	) {}

	/**
	 * Creates a service account with a personal project for a new agent and sets
	 * `agent.identityId`. Call it in the transaction that inserts the agent,
	 * so a failed insert leaves no account behind.
	 */
	async assignToNewAgent(agent: Agent, ctx: OperationContext): Promise<void> {
		if (!this.agentsConfig.serviceAccountsEnabled) return;
		// The REST create trims the name, but an import takes it from the package.
		if (agent.name.trim() === '') throw new BadRequestError('An agent needs a name');

		const { serviceAccount } = await this.serviceAccountService.create(agent.name, ctx);
		agent.identityId = serviceAccount.id;
	}

	/**
	 * Gives an instance agent a service account when it has none. Instance agents
	 * register on every start, so this also covers the ones created earlier. When
	 * two mains start together, only one links its account and the other rolls back.
	 */
	async assignToInstanceAgent(agentId: string, name: string): Promise<void> {
		if (!this.agentsConfig.serviceAccountsEnabled) return;
		if (await this.agentRepository.findIdentityId(agentId)) return;

		try {
			await this.transactionRunner.run({}, async (ctx) => {
				const { serviceAccount } = await this.serviceAccountService.create(name, ctx);
				if (!(await this.agentRepository.linkIdentity(agentId, serviceAccount.id, ctx))) {
					throw new IdentityAlreadyLinkedError();
				}
			});
		} catch (error) {
			if (error instanceof IdentityAlreadyLinkedError) return;
			throw error;
		}
	}
}
