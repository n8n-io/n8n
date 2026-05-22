import { Service } from '@n8n/di';

import type { ICredentialConnectionStatusProvider } from './credential-connection-status-provider.interface';

/**
 * Proxy between the core credentials service and module-owned per-user
 * connection state. When no provider is registered (feature disabled or
 * module not loaded) every lookup degrades to "not connected" so read
 * endpoints keep working.
 */
@Service()
export class CredentialConnectionStatusProxy implements ICredentialConnectionStatusProvider {
	private provider?: ICredentialConnectionStatusProvider;

	setProvider(provider: ICredentialConnectionStatusProvider): void {
		this.provider = provider;
	}

	async findConnectedCredentialIds(userId: string, credentialIds: string[]): Promise<Set<string>> {
		if (!this.provider || credentialIds.length === 0) return new Set();
		return await this.provider.findConnectedCredentialIds(userId, credentialIds);
	}
}
