import type { Iso8601DateTimeString } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

// clientId -> "userId|lastSeen"
type WorkflowCacheHash = Record<string, string>;
interface CacheEntry {
	userId: string;
	lastSeen: string;
	clientId: string;
}

/**
 * State management for the collaboration service. Workflow active
 * users are stored in a hash in the following format:
 * {
 *   [workflowId] -> {
 *     [userId] -> lastSeenAsIso8601String
 *   }
 * }
 */
@Service()
export class CollaborationState {
	/**
	 * After how many minutes of inactivity a user should be removed
	 * as being an active user of a workflow.
	 */
	readonly inactivityCleanUpTime = 15 * Time.minutes.toMilliseconds;

	constructor(private readonly cache: CacheService) {}

	/**
	 * Per-resource promise chains that serialize write-lock operations.
	 * Without this, two concurrent push handlers can both observe an empty
	 * lock and then both write — or a heartbeat can restore a stale lock
	 * after a forced takeover. Each chain ensures the check-then-act
	 * sequence for a given resource runs without interleaving.
	 */
	private lockChains = new Map<string, Promise<unknown>>();

	private serializeLockOp<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const previous = this.lockChains.get(key) ?? Promise.resolve();
		const next = previous.then(fn, fn);
		// Keep the chain alive for the next op, but don't reject the chain
		// if this op throws — the caller still sees the real error.
		this.lockChains.set(
			key,
			next.catch(() => {}),
		);
		return next;
	}

	/**
	 * Mark client (tab) active for given workflow
	 */
	async addCollaborator(workflowId: Workflow['id'], userId: User['id'], clientId: string) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		const cacheEntry: WorkflowCacheHash = {
			[clientId]: `${userId}|${new Date().toISOString()}`,
		};

		await this.cache.setHash(cacheKey, cacheEntry);
	}

	/**
	 * Remove client (tab) from workflow's active collaborators
	 */
	async removeCollaborator(workflowId: Workflow['id'], clientId: string) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		await this.cache.deleteFromHash(cacheKey, clientId);
	}

	async getCollaborators(workflowId: Workflow['id']): Promise<CacheEntry[]> {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		const cacheValue = await this.cache.getHash<string>(cacheKey);
		if (!cacheValue) {
			return [];
		}

		const { valid, invalid } = this.parseCacheHashToCollaborators(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(valid);

		const toRemove = [...expired, ...invalid];
		if (toRemove.length > 0) {
			void this.removeExpiredCollaborators(workflowId, toRemove);
		}

		// Deduplicate by userId - keep the most recent entry for each user
		const userMap = new Map<string, CacheEntry>();
		for (const entry of stillActive) {
			const existing = userMap.get(entry.userId);
			if (!existing || new Date(entry.lastSeen) > new Date(existing.lastSeen)) {
				userMap.set(entry.userId, entry);
			}
		}

		return Array.from(userMap.values());
	}

	private formWorkflowCacheKey(workflowId: Workflow['id']) {
		return `collaboration:${workflowId}`;
	}

	private splitToExpiredAndStillActive(collaborators: CacheEntry[]) {
		const expired: CacheEntry[] = [];
		const stillActive: CacheEntry[] = [];

		for (const collaborator of collaborators) {
			if (this.hasSessionExpired(collaborator.lastSeen)) {
				expired.push(collaborator);
			} else {
				stillActive.push(collaborator);
			}
		}

		return [expired, stillActive];
	}

	private async removeExpiredCollaborators(
		workflowId: Workflow['id'],
		expiredClients: CacheEntry[],
	) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		await Promise.all(
			expiredClients.map(
				async (client) => await this.cache.deleteFromHash(cacheKey, client.clientId),
			),
		);
	}

	private parseCacheHashToCollaborators(workflowCacheEntry: WorkflowCacheHash): {
		valid: CacheEntry[];
		invalid: CacheEntry[];
	} {
		const valid: CacheEntry[] = [];
		const invalid: CacheEntry[] = [];

		for (const [clientId, value] of Object.entries(workflowCacheEntry)) {
			const parts = value.split('|');

			// Handle old format (pre-tab-scoped collaboration) where value was just a timestamp
			// Old: { "userId": "2026-02-26T21:23:36.318Z" }
			// New: { "clientId": "userId|2026-02-26T21:23:36.318Z" }
			if (parts.length === 1) {
				invalid.push({
					clientId,
					userId: '', // Not needed for deletion
					lastSeen: value,
				});
			} else {
				const [userId, lastSeen] = parts;
				valid.push({
					userId,
					lastSeen,
					clientId,
				});
			}
		}

		return { valid, invalid };
	}

	private hasSessionExpired(lastSeenString: Iso8601DateTimeString) {
		const expiryTime = new Date(lastSeenString).getTime() + this.inactivityCleanUpTime;

		return Date.now() > expiryTime;
	}

	/**
	 * TTL for write locks. After this time without renewal, the lock expires.
	 */
	readonly writeLockTtl = 2 * Time.minutes.toMilliseconds;

	async setWriteLock(workflowId: Workflow['id'], clientId: string, userId: User['id']) {
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		const lockData = JSON.stringify({ clientId, userId });
		await this.cache.set(cacheKey, lockData, this.writeLockTtl);
	}

	/**
	 * Atomically acquire the write lock: set only if absent or already held
	 * by the same client. Returns true if acquired, false if another client
	 * holds the lock.
	 */
	async acquireWriteLock(
		workflowId: Workflow['id'],
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		return this.serializeLockOp(this.formWriteLockCacheKey(workflowId), async () => {
			const current = await this.getWriteLock(workflowId);
			if (current && current.clientId !== clientId) return false;
			await this.setWriteLock(workflowId, clientId, userId);
			return true;
		});
	}

	async renewWriteLock(workflowId: Workflow['id'], clientId: string) {
		return this.serializeLockOp(this.formWriteLockCacheKey(workflowId), async () => {
			const currentLock = await this.getWriteLock(workflowId);
			if (currentLock?.clientId === clientId) {
				const lockData = JSON.stringify(currentLock);
				await this.cache.set(this.formWriteLockCacheKey(workflowId), lockData, this.writeLockTtl);
			}
		});
	}

	async getWriteLock(
		workflowId: Workflow['id'],
	): Promise<{ clientId: string; userId: string } | null> {
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		const lockData = await this.cache.get<string>(cacheKey);

		if (!lockData) {
			return null;
		}

		const parsed = jsonParse<{ clientId: string; userId: string } | null>(lockData, {
			fallbackValue: null,
		});

		if (!parsed?.clientId || !parsed?.userId) {
			return null;
		}

		return parsed;
	}

	async releaseWriteLock(workflowId: Workflow['id']) {
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		await this.cache.delete(cacheKey);
	}

	/**
	 * Atomically release the write lock only if the caller holds it.
	 * Prevents a release from deleting a lock that was taken over by
	 * another tab between the check and the delete.
	 */
	async releaseWriteLockIfHolder(workflowId: Workflow['id'], clientId: string): Promise<boolean> {
		return this.serializeLockOp(this.formWriteLockCacheKey(workflowId), async () => {
			const current = await this.getWriteLock(workflowId);
			if (current?.clientId !== clientId) return false;
			await this.cache.delete(this.formWriteLockCacheKey(workflowId));
			return true;
		});
	}

	private formWriteLockCacheKey(workflowId: Workflow['id']) {
		return `collaboration:write-lock:${workflowId}`;
	}

	/**
	 * Acquire write lock forcefully, stealing from same user's other tab.
	 * Serialized so a concurrent heartbeat cannot restore the old lock
	 * between the check and the set.
	 *
	 * @returns true if lock was acquired, false if lock is held by different user
	 */
	async acquireWriteLockForce(
		workflowId: Workflow['id'],
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		return this.serializeLockOp(this.formWriteLockCacheKey(workflowId), async () => {
			const currentLock = await this.getWriteLock(workflowId);
			if (currentLock && currentLock.userId !== userId) return false;
			await this.setWriteLock(workflowId, clientId, userId);
			return true;
		});
	}

	// --- Agent-scoped collaboration --------------------------------------

	/**
	 * Mark client (tab) active for given agent.
	 */
	async addAgentCollaborator(agentId: string, userId: User['id'], clientId: string) {
		const cacheKey = this.formAgentCacheKey(agentId);
		const cacheEntry: WorkflowCacheHash = {
			[clientId]: `${userId}|${new Date().toISOString()}`,
		};

		await this.cache.setHash(cacheKey, cacheEntry);
	}

	/**
	 * Remove client (tab) from agent's active collaborators.
	 */
	async removeAgentCollaborator(agentId: string, clientId: string) {
		const cacheKey = this.formAgentCacheKey(agentId);

		await this.cache.deleteFromHash(cacheKey, clientId);
	}

	async getAgentCollaborators(agentId: string): Promise<CacheEntry[]> {
		const cacheKey = this.formAgentCacheKey(agentId);

		const cacheValue = await this.cache.getHash<string>(cacheKey);
		if (!cacheValue) {
			return [];
		}

		const { valid, invalid } = this.parseCacheHashToCollaborators(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(valid);

		const toRemove = [...expired, ...invalid];
		if (toRemove.length > 0) {
			void this.removeExpiredAgentCollaborators(agentId, toRemove);
		}

		// Deduplicate by userId - keep the most recent entry for each user
		const userMap = new Map<string, CacheEntry>();
		for (const entry of stillActive) {
			const existing = userMap.get(entry.userId);
			if (!existing || new Date(entry.lastSeen) > new Date(existing.lastSeen)) {
				userMap.set(entry.userId, entry);
			}
		}

		return Array.from(userMap.values());
	}

	private formAgentCacheKey(agentId: string) {
		return `collaboration:agent:${agentId}`;
	}

	private async removeExpiredAgentCollaborators(agentId: string, expiredClients: CacheEntry[]) {
		const cacheKey = this.formAgentCacheKey(agentId);
		await Promise.all(
			expiredClients.map(
				async (client) => await this.cache.deleteFromHash(cacheKey, client.clientId),
			),
		);
	}

	async setAgentWriteLock(agentId: string, clientId: string, userId: User['id']) {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		const lockData = JSON.stringify({ clientId, userId });
		await this.cache.set(cacheKey, lockData, this.writeLockTtl);
	}

	/**
	 * Atomically acquire the agent write lock: set only if absent or
	 * already held by the same client. Returns true if acquired.
	 */
	async acquireAgentWriteLock(
		agentId: string,
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		return this.serializeLockOp(this.formAgentWriteLockCacheKey(agentId), async () => {
			const current = await this.getAgentWriteLock(agentId);
			if (current && current.clientId !== clientId) return false;
			await this.setAgentWriteLock(agentId, clientId, userId);
			return true;
		});
	}

	async renewAgentWriteLock(agentId: string, clientId: string) {
		return this.serializeLockOp(this.formAgentWriteLockCacheKey(agentId), async () => {
			const currentLock = await this.getAgentWriteLock(agentId);
			if (currentLock?.clientId === clientId) {
				const lockData = JSON.stringify(currentLock);
				await this.cache.set(this.formAgentWriteLockCacheKey(agentId), lockData, this.writeLockTtl);
			}
		});
	}

	async getAgentWriteLock(agentId: string): Promise<{ clientId: string; userId: string } | null> {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		const lockData = await this.cache.get<string>(cacheKey);

		if (!lockData) {
			return null;
		}

		const parsed = jsonParse<{ clientId: string; userId: string } | null>(lockData, {
			fallbackValue: null,
		});

		if (!parsed?.clientId || !parsed?.userId) {
			return null;
		}

		return parsed;
	}

	async releaseAgentWriteLock(agentId: string) {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		await this.cache.delete(cacheKey);
	}

	/**
	 * Atomically release the agent write lock only if the caller holds it.
	 */
	async releaseAgentWriteLockIfHolder(agentId: string, clientId: string): Promise<boolean> {
		return this.serializeLockOp(this.formAgentWriteLockCacheKey(agentId), async () => {
			const current = await this.getAgentWriteLock(agentId);
			if (current?.clientId !== clientId) return false;
			await this.cache.delete(this.formAgentWriteLockCacheKey(agentId));
			return true;
		});
	}

	private formAgentWriteLockCacheKey(agentId: string) {
		return `collaboration:write-lock:agent:${agentId}`;
	}

	/**
	 * Acquire agent write lock forcefully, stealing from same user's other tab.
	 * Serialized so a concurrent heartbeat cannot restore the old lock.
	 *
	 * @returns true if lock was acquired, false if lock is held by different user
	 */
	async acquireAgentWriteLockForce(
		agentId: string,
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		return this.serializeLockOp(this.formAgentWriteLockCacheKey(agentId), async () => {
			const currentLock = await this.getAgentWriteLock(agentId);
			if (currentLock && currentLock.userId !== userId) return false;
			await this.setAgentWriteLock(agentId, clientId, userId);
			return true;
		});
	}
}
