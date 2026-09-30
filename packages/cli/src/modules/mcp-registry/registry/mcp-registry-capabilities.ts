import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

// Add capabilities here when they do not depend on instance configuration.
const BASE_CAPABILITIES: readonly string[] = [];

const N8N_CLOUD_CAPABILITY = 'n8n-cloud';

@Service()
export class McpRegistryCapabilities {
	private readonly supportedCapabilities = new Set(BASE_CAPABILITIES);

	constructor(globalConfig: GlobalConfig) {
		if (globalConfig.deployment.type === 'cloud') {
			this.supportedCapabilities.add(N8N_CLOUD_CAPABILITY);
		}
	}

	supports(requiredCapabilities?: string[]): boolean {
		return (
			requiredCapabilities?.every((capability) => this.supportedCapabilities.has(capability)) ??
			true
		);
	}
}
