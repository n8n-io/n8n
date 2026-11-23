import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';

import { ServiceAccountService } from '@/services/service-account.service';

import { AgentServiceAccountService } from '../agent-service-account.service';
import { AgentRepository } from '../repositories/agent.repository';
import { SystemAgentRegistry } from './system-agent-registry';
import type { SystemAgentProvider } from './system-agent.types';

/** Rolls back the account of the main that lost the race to insert an instance agent. */
class InstanceAgentExistsError extends Error {}

/**
 * Registers the code-defined instance agents of other modules. A module calls
 * this once at init. The Agents runtime then finds the provider in the
 * registry for the turns of its agent.
 */
@Service()
export class SystemAgentRegistrationService {
	constructor(
		private readonly registry: SystemAgentRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly serviceAccountService: ServiceAccountService,
		private readonly transactionRunner: TransactionRunner,
		private readonly agentServiceAccount: AgentServiceAccountService,
	) {}

	/** Register a provider and make sure its instance agent row exists. */
	async register<TLease>(provider: SystemAgentProvider<TLease>): Promise<void> {
		await this.ensureInstanceAgent(provider.agentId, provider.name);
		this.registry.register(provider);
	}

	/**
	 * Creates the row of an instance agent with its service account, or renames
	 * an existing row and its account. When two mains start together, only one
	 * inserts the row and the other rolls back its account.
	 */
	async ensureInstanceAgent(id: string, name: string): Promise<void> {
		if (await this.agentRepository.renameInstanceAgentIfExists(id, name)) return;

		let identityId: string;
		try {
			identityId = await this.transactionRunner.run({}, async (ctx) => {
				const { serviceAccount } = await this.serviceAccountService.create(name, ctx);
				if (!(await this.agentRepository.insertInstanceAgent(id, name, serviceAccount.id, ctx))) {
					throw new InstanceAgentExistsError();
				}
				return serviceAccount.id;
			});
		} catch (error) {
			if (!(error instanceof InstanceAgentExistsError)) throw error;
			await this.agentRepository.renameInstanceAgentIfExists(id, name);
			return;
		}
		// After the commit: the main that lost the race rolled back and sends nothing.
		this.agentServiceAccount.reportCreated(
			{ id, identityId, projectId: null },
			{ kind: 'system', reason: 'startup' },
		);
	}
}
