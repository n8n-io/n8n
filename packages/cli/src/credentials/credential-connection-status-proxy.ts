import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

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

	async countConnectedUsers(credentialId: string): Promise<number> {
		if (!this.provider) return 0;
		return await this.provider.countConnectedUsers(credentialId);
	}

	async deleteAllUserEntries(credentialId: string, em?: EntityManager): Promise<void> {
		if (!this.provider) return;
		await this.provider.deleteAllUserEntries(credentialId, em);
	}

	async cleanupOrphanedEntriesForUsers(
		userIds: string[],
		em?: EntityManager,
		credentialId?: string,
	): Promise<void> {
		if (!this.provider || userIds.length === 0) return;
		await this.provider.cleanupOrphanedEntriesForUsers(userIds, em, credentialId);
	}

	async cleanupOrphanedEntriesForProjects(
		credentialId: string,
		projectIds: string[],
		em?: EntityManager,
	): Promise<void> {
		if (!this.provider || projectIds.length === 0) return;
		await this.provider.cleanupOrphanedEntriesForProjects(credentialId, projectIds, em);
	}
}
