import { Service } from '@n8n/di';

import type { SecretsProvider } from './types';

/**
 * Manages the collection of active secrets providers
 * Provides simple CRUD operations for providers
 */
@Service()
export class ExternalSecretsProviderRegistry {
	private providers = new Map<string, SecretsProvider>();

	add(name: string, provider: SecretsProvider): void {
		this.providers.set(name, provider);
	}

	remove(name: string): void {
		this.providers.delete(name);
	}

	get(name: string): SecretsProvider | undefined {
		return this.providers.get(name);
	}

	has(name: string): boolean {
		return this.providers.has(name);
	}

	getAll(): Map<string, SecretsProvider> {
		return new Map(this.providers);
	}

	getConnected(): Map<string, SecretsProvider> {
		const result = new Map<string, SecretsProvider>();
		for (const [name, provider] of this.providers) {
			if (provider.state === 'connected') {
				result.set(name, provider);
			}
		}
		return result;
	}

	getConnectedNames(): string[] {
		return Array.from(this.getConnected().keys());
	}

	getNames(): string[] {
		return Array.from(this.providers.keys());
	}

	clear(): void {
		this.providers.clear();
	}

	async disconnectAll(): Promise<void> {
		const disconnectPromises = Array.from(this.providers.values()).map(
			async (provider) =>
				await provider.disconnect().catch(() => {
					// Ignore errors during shutdown
				}),
		);
		await Promise.all(disconnectPromises);
	}
}
