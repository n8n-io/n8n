import { Service } from '@n8n/di';

export type CredentialConnectionStatusCleanup = (userIds: string[]) => Promise<void>;

@Service()
export class CredentialConnectionStatusRegistry {
	private cleanup?: CredentialConnectionStatusCleanup;

	registerCleanup(cleanup: CredentialConnectionStatusCleanup): void {
		this.cleanup = cleanup;
	}

	async cleanupOrphanedEntriesForUsers(userIds: string[]): Promise<void> {
		if (!this.cleanup || userIds.length === 0) return;
		await this.cleanup(userIds);
	}
}
