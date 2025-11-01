import type { Iso8601DateTimeString } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

type WorkflowCacheHash = Record<User['id'], Iso8601DateTimeString>;
interface CacheEntry {
	userId: string;
	lastSeen: string;
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
	 * Mark user active for given workflow
	 */
	async addCollaborator(workflowId: Workflow['id'], userId: User['id']) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		const cacheEntry: WorkflowCacheHash = {
			[userId]: new Date().toISOString(),
		};

		await this.cache.setHash(cacheKey, cacheEntry);
	}

	/**
	 * Remove user from workflow's active users
	 */
	async removeCollaborator(workflowId: Workflow['id'], userId: User['id']) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		await this.cache.deleteFromHash(cacheKey, userId);
	}

	async getCollaborators(workflowId: Workflow['id']): Promise<CacheEntry[]> {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		const cacheValue = await this.cache.getHash<Iso8601DateTimeString>(cacheKey);
		if (!cacheValue) {
			return [];
		}

		const activeCollaborators = this.cacheHashToCollaborators(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(activeCollaborators);

		if (expired.length > 0) {
			void this.removeExpiredCollaborators(workflowId, expired);
		}

		return stillActive;
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

	private async removeExpiredCollaborators(workflowId: Workflow['id'], expiredUsers: CacheEntry[]) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		await Promise.all(
			expiredUsers.map(async (user) => await this.cache.deleteFromHash(cacheKey, user.userId)),
		);
	}

	private cacheHashToCollaborators(workflowCacheEntry: WorkflowCacheHash): CacheEntry[] {
		return Object.entries(workflowCacheEntry).map(([userId, lastSeen]) => ({
			userId,
			lastSeen,
		}));
	}

	private hasSessionExpired(lastSeenString: Iso8601DateTimeString) {
		const expiryTime = new Date(lastSeenString).getTime() + this.inactivityCleanUpTime;

		return Date.now() > expiryTime;
	}
}
