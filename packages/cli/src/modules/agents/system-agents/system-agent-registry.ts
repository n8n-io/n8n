import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { SystemAgentProvider } from './system-agent.types';

/**
 * Holds the code-defined instance agents. A module registers its provider at
 * init through `SystemAgentExecutionService.register`. With no provider, every
 * system-agent hook in the Agents runtime is inert.
 */
@Service()
export class SystemAgentRegistry {
	private readonly providers = new Map<string, SystemAgentProvider>();

	register(provider: SystemAgentProvider): void {
		if (this.providers.has(provider.agentId)) {
			throw new UnexpectedError(`System agent "${provider.agentId}" is already registered`);
		}
		this.providers.set(provider.agentId, provider);
	}

	get(agentId: string): SystemAgentProvider | undefined {
		return this.providers.get(agentId);
	}

	has(agentId: string): boolean {
		return this.providers.has(agentId);
	}
}
