import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

export interface AgentProjectLookup {
	/** The ID of the project that owns the agent, or `null` when the project has no such agent. */
	getProjectIdById(agentId: string): Promise<string | null>;
}

/**
 * Lets collaboration find the project of an agent without an import of the agents module.
 * The agents module registers the provider on init. Throws until a provider is registered.
 */
@Service()
export class AgentProjectLookupProxy implements AgentProjectLookup {
	private provider: AgentProjectLookup | null = null;

	registerProvider(provider: AgentProjectLookup): void {
		this.provider = provider;
	}

	async getProjectIdById(agentId: string): Promise<string | null> {
		if (!this.provider) {
			throw new UnexpectedError('No agent project lookup is registered on AgentProjectLookupProxy');
		}
		return await this.provider.getProjectIdById(agentId);
	}
}
