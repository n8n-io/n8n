import { Service } from '@n8n/di';

import { AgentRepository } from '../repositories/agent.repository';
import { SystemAgentRegistry } from './system-agent-registry';
import type { SystemAgentProvider } from './system-agent.types';

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
	) {}

	/** Register a provider and make sure its instance agent row exists. */
	async register<TLease>(provider: SystemAgentProvider<TLease>): Promise<void> {
		await this.agentRepository.ensureInstanceAgent(provider.agentId, provider.name);
		this.registry.register(provider);
	}
}
