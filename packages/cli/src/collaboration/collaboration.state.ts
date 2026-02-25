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

		const activeCollaborators = this.cacheHashToCollaborators(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(activeCollaborators);

		if (expired.length > 0) {
			void this.removeExpiredCollaborators(workflowId, expired);
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

	private cacheHashToCollaborators(workflowCacheEntry: WorkflowCacheHash): CacheEntry[] {
		return Object.entries(workflowCacheEntry).map(([clientId, value]) => {
			const [userId, lastSeen] = value.split('|');
			return {
				userId,
				lastSeen,
				clientId,
			};
		});
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

	async renewWriteLock(workflowId: Workflow['id'], clientId: string) {
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		const currentLock = await this.getWriteLock(workflowId);

		if (currentLock?.clientId === clientId) {
			// Re-store the same lock data with renewed TTL
			const lockData = JSON.stringify(currentLock);
			await this.cache.set(cacheKey, lockData, this.writeLockTtl);
		}
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

	private formWriteLockCacheKey(workflowId: Workflow['id']) {
		return `collaboration:write-lock:${workflowId}`;
	}

	/**
	 * Acquire write lock forcefully, stealing from same user's other tab.
	 *
	 * @returns true if lock was acquired, false if lock is held by different user
	 */
	async acquireWriteLockForce(
		workflowId: Workflow['id'],
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		const currentLock = await this.getWriteLock(workflowId);

		if (currentLock && currentLock.userId !== userId) {
			// Different user owns the lock, cannot steal
			return false;
		}

		await this.setWriteLock(workflowId, clientId, userId);
		return true;
	}
}
