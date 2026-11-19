import { SandboxProviderHealth } from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';

/**
 * Health of each sandbox provider for this process. Every Assistant sandbox
 * service uses this one instance, so a provider outage that one service sees
 * also makes the others skip the provider.
 */
@Service()
export class InstanceAiSandboxProviderHealth extends SandboxProviderHealth {
	constructor() {
		super();
	}
}
