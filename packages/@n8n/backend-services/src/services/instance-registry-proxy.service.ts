import type { InstanceRegistration } from '@n8n/api-types';
import { Service } from '@n8n/di';

export interface InstanceRegistryProvider {
	getAllInstances(): Promise<InstanceRegistration[]>;
	getLocalInstance(): InstanceRegistration | null;
	/** Writes the registration of this process again, so a change shows at once. */
	refreshRegistration?(): Promise<void>;
}

@Service()
export class InstanceRegistryProxyService implements InstanceRegistryProvider {
	private provider: InstanceRegistryProvider | null = null;

	private readonly capabilities = new Set<string>();

	registerProvider(provider: InstanceRegistryProvider): void {
		this.provider = provider;
	}

	async getAllInstances(): Promise<InstanceRegistration[]> {
		if (!this.provider) return [];
		return await this.provider.getAllInstances();
	}

	getLocalInstance(): InstanceRegistration | null {
		if (!this.provider) return null;
		return this.provider.getLocalInstance();
	}

	/**
	 * Adds a capability to the registration of this process. Other processes
	 * see it after the next registry write, which this call starts at once.
	 */
	async advertiseCapability(capability: string): Promise<void> {
		if (this.capabilities.has(capability)) return;
		this.capabilities.add(capability);
		await this.provider?.refreshRegistration?.();
	}

	/** Removes a capability, for example when this process starts to shut down. */
	async withdrawCapability(capability: string): Promise<void> {
		if (!this.capabilities.delete(capability)) return;
		await this.provider?.refreshRegistration?.();
	}

	/** Capabilities of this process, sorted, for the registry to write. */
	localCapabilities(): string[] {
		return [...this.capabilities].sort();
	}
}
