import {
	In,
	ProjectRelationRepository,
	SharedCredentialsRepository,
	UserRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';

import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';
import { RoleService } from '@/services/role.service';

import { SYSTEM_RESOLVER_ID } from '../constants';
import { DynamicCredentialUserEntry } from '../database/entities/dynamic-credential-user-entry';
import { DynamicCredentialUserEntryRepository } from '../database/repositories/dynamic-credential-user-entry.repository';

type CredentialUserPair = { credentialId: string; userId: string };

// A per-user connection is retained while the user can still connect their own
// account — `credential:connect`, not `credential:update` (see oauth.service.ts).
const CREDENTIAL_RETAIN_SCOPE = 'credential:connect' as const;

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
		private readonly projectRelationRepository: ProjectRelationRepository,
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

	async cleanupOrphanedEntriesForUsers(
		userIds: string[],
		em?: EntityManager,
		credentialId?: string,
	): Promise<void> {
		if (userIds.length === 0) return;

		const manager = em ?? this.repository.manager;

		// When a credentialId is given, scope the scan to that credential so a
		// single-credential event never re-evaluates unrelated connections.
		const entries = await manager.find(DynamicCredentialUserEntry, {
			select: ['credentialId', 'userId'],
			where: { userId: In(userIds), ...(credentialId ? { credentialId } : {}) },
		});

		if (entries.length === 0) return;

		const pairs = entries.map((e) => ({ credentialId: e.credentialId, userId: e.userId }));
		await this.deleteOrphanedPairs(pairs, manager);
	}

	/**
	 * Re-evaluates the given credential's connections for members of the given
	 * projects, deleting those who no longer retain access. Used when an event
	 * changes who can see one credential (unshare, move to another project).
	 */
	async cleanupOrphanedEntriesForProjects(
		credentialId: string,
		projectIds: string[],
		em?: EntityManager,
	): Promise<void> {
		if (projectIds.length === 0) return;

		const manager = em ?? this.repository.manager;
		const members = await manager.findBy(this.projectRelationRepository.target, {
			projectId: In(projectIds),
		});
		const userIds = [...new Set(members.map((m) => m.userId))];

		await this.cleanupOrphanedEntriesForUsers(userIds, em, credentialId);
	}

	/**
	 * Deletes ALL per-user entries (across all resolvers) for each
	 * (credentialId, userId) pair whose user no longer holds `credential:connect`
	 * on the credential.
	 */
	private async deleteOrphanedPairs(pairs: CredentialUserPair[], em: EntityManager): Promise<void> {
		if (pairs.length === 0) return;

		const uniquePairs = [...new Map(pairs.map((p) => [keyOf(p), p])).values()];

		// All reads use `em` so a caller's transaction never has to acquire a
		// second pooled connection (which deadlocks at pool size 1).
		const users = await em.find(this.userRepository.target, {
			where: { id: In(uniquePairs.map((p) => p.userId)) },
			relations: { role: { scopes: true } },
		});
		const userById = new Map(users.map((u) => [u.id, u]));

		const pairsToCheck = uniquePairs.filter((p) => userById.has(p.userId));

		let projectRetainedKeys = new Set<string>();
		if (pairsToCheck.length > 0) {
			// Credential roles that carry credential:connect — served from the role
			const validCredRoles = await this.roleService.rolesWithScope(
				'credential',
				CREDENTIAL_RETAIN_SCOPE,
				em,
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
	 * A pair is orphaned unless the user retains `credential:connect`.
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
