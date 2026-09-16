import { Service } from '@n8n/di';

const SUPPORTED_CAPABILITIES = ['test-capability'];

@Service()
export class McpRegistryCapabilities {
	private readonly supportedCapabilities = new Set(SUPPORTED_CAPABILITIES);

	supports(requiredCapabilities?: string[]): boolean {
		return (
			requiredCapabilities?.every((capability) => this.supportedCapabilities.has(capability)) ??
			true
		);
	}
}
