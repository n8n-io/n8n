import { In, SharedCredentialsRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';
import { RoleService } from '@/services/role.service';

import { SYSTEM_RESOLVER_ID } from '../constants';
import { DynamicCredentialUserEntry } from '../database/entities/dynamic-credential-user-entry';
import { DynamicCredentialUserEntryRepository } from '../database/repositories/dynamic-credential-user-entry.repository';

type CredentialUserPair = { credentialId: string; userId: string };

const CREDENTIAL_RETAIN_SCOPE = 'credential:update' as const;

const keyOf = (pair: CredentialUserPair) => `${pair.credentialId}|${pair.userId}`;

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
	constructor(
		private readonly repository: DynamicCredentialUserEntryRepository,
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly roleService: RoleService,
	) {}

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

	async countConnectedUsers(credentialId: string): Promise<number> {
		return await this.repository.countBy({ credentialId });
	}

	async deleteAllUserEntries(credentialId: string, em?: EntityManager): Promise<void> {
		const manager = em ?? this.repository.manager;
		await manager.delete(DynamicCredentialUserEntry, { credentialId });
	}

	async cleanupOrphanedEntriesForUsers(userIds: string[], em?: EntityManager): Promise<void> {
		if (userIds.length === 0) return;

		const manager = em ?? this.repository.manager;

		const entries = await manager.find(DynamicCredentialUserEntry, {
			select: ['credentialId', 'userId'],
			where: { userId: In(userIds) },
		});

		if (entries.length === 0) return;

		const pairs = entries.map((e) => ({ credentialId: e.credentialId, userId: e.userId }));
		await this.deleteOrphanedPairs(pairs, manager);
	}

	/**
	 * Deletes ALL per-user entries (across all resolvers) for each
	 * (credentialId, userId) pair whose user no longer holds `credential:update`
	 * on the credential.
	 */
	private async deleteOrphanedPairs(pairs: CredentialUserPair[], em: EntityManager): Promise<void> {
		if (pairs.length === 0) return;

		const uniquePairs = [...new Map(pairs.map((p) => [keyOf(p), p])).values()];

		const users = await this.userRepository.find({
			where: { id: In(uniquePairs.map((p) => p.userId)) },
			relations: { role: { scopes: true } },
		});
		const userById = new Map(users.map((u) => [u.id, u]));

		const pairsToCheck = uniquePairs.filter((p) => userById.has(p.userId));

		let projectRetainedKeys = new Set<string>();
		if (pairsToCheck.length > 0) {
			// Credential roles that carry credential:update — served from the role
			const validCredRoles = await this.roleService.rolesWithScope(
				'credential',
				CREDENTIAL_RETAIN_SCOPE,
			);
			const projectRetained = await this.sharedCredentialsRepository.findPairsWithCredentialAccess(
				pairsToCheck,
				CREDENTIAL_RETAIN_SCOPE,
				validCredRoles,
				em,
			);
			projectRetainedKeys = new Set(projectRetained.map(keyOf));
		}

		const toDelete = this.selectOrphanedPairs(uniquePairs, userById, projectRetainedKeys);
		if (toDelete.length > 0) {
			await this.repository.deleteByPairs(toDelete, em);
		}
	}

	/**
	 * A pair is orphaned unless the user retains `credential:update`.
	 */
	private selectOrphanedPairs(
		pairs: CredentialUserPair[],
		userById: Map<string, User>,
		projectRetainedKeys: Set<string>,
	): CredentialUserPair[] {
		return pairs.filter((pair) => {
			const user = userById.get(pair.userId);
			if (!user) return true;
			if (hasGlobalScope(user, CREDENTIAL_RETAIN_SCOPE)) return false;
			return !projectRetainedKeys.has(keyOf(pair));
		});
	}
}
