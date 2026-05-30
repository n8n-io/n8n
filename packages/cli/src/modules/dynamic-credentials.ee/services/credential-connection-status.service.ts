import { Service } from '@n8n/di';
import { In } from '@n8n/db';

import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';

import { SYSTEM_RESOLVER_ID } from '../constants';
import { DynamicCredentialUserEntryRepository } from '../database/repositories/dynamic-credential-user-entry.repository';

/**
 * Returns the set of credential ids for which a given user has a per-user
 * storage entry under the system resolver. Existence is the signal — no
 * decryption is performed.
 *
 * Scoped to the system resolver ({@link SYSTEM_RESOLVER_ID}) because that is
 * the only resolver used to record per-user OAuth connections today. Entries
 * from other resolvers do not count as a user-visible "connection".
 *
 * Backs {@link CredentialConnectionStatusProxy} which exposes the data to the
 * core credentials service.
 */
@Service()
export class CredentialConnectionStatusService implements ICredentialConnectionStatusProvider {
	constructor(private readonly repository: DynamicCredentialUserEntryRepository) {}

	async findConnectedCredentialIds(userId: string, credentialIds: string[]): Promise<Set<string>> {
		if (credentialIds.length === 0) return new Set();

		const rows = await this.repository.find({
			select: ['credentialId'],
			where: {
				userId,
				resolverId: SYSTEM_RESOLVER_ID,
				credentialId: In(credentialIds),
			},
		});

		return new Set(rows.map((row) => row.credentialId));
	}

	/**
	 * Deletes the running user's connection row(s) for the given credential.
	 * Scoped to the system resolver to mirror {@link findConnectedCredentialIds}.
	 * Returns the number of rows deleted.
	 */
	async deleteMyConnection(userId: string, credentialId: string): Promise<number> {
		const result = await this.repository.delete({
			userId,
			credentialId,
			resolverId: SYSTEM_RESOLVER_ID,
		});

		return result.affected ?? 0;
	}
}
