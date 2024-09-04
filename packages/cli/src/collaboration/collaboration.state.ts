import type { ActiveWorkflowUser } from '@/collaboration/collaboration.types';
import { Time } from '@/constants';
import type { Iso8601DateTimeString } from '@/interfaces';
import { CacheService } from '@/services/cache/cache.service';
import type { User } from '@/databases/entities/user';
import { type Workflow } from 'n8n-workflow';
import { Service } from 'typedi';

type WorkflowCacheHash = Record<User['id'], Iso8601DateTimeString>;

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
	public readonly inactivityCleanUpTime = 15 * Time.minutes.toMilliseconds;

	constructor(private readonly cache: CacheService) {}

	/**
	 * Mark user active for given workflow
	 */
	async addActiveWorkflowUser(workflowId: Workflow['id'], userId: User['id']) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		const cacheEntry: WorkflowCacheHash = {
			[userId]: new Date().toISOString(),
		};

		await this.cache.setHash(cacheKey, cacheEntry);
	}

	/**
	 * Remove user from workflow's active users
	 */
	async removeActiveWorkflowUser(workflowId: Workflow['id'], userId: User['id']) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		await this.cache.deleteFromHash(cacheKey, userId);
	}

	async getActiveWorkflowUsers(workflowId: Workflow['id']): Promise<ActiveWorkflowUser[]> {
		const cacheKey = this.formWorkflowCacheKey(workflowId);

		const cacheValue = await this.cache.getHash<Iso8601DateTimeString>(cacheKey);
		if (!cacheValue) {
			return [];
		}

		const workflowActiveUsers = this.cacheHashToWorkflowActiveUsers(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(workflowActiveUsers);

		if (expired.length > 0) {
			void this.removeExpiredUsersForWorkflow(workflowId, expired);
		}

		return stillActive;
	}

	private formWorkflowCacheKey(workflowId: Workflow['id']) {
		return `collaboration:${workflowId}`;
	}

	private splitToExpiredAndStillActive(workflowUsers: ActiveWorkflowUser[]) {
		const expired: ActiveWorkflowUser[] = [];
		const stillActive: ActiveWorkflowUser[] = [];

		for (const user of workflowUsers) {
			if (this.hasUserExpired(user.lastSeen)) {
				expired.push(user);
			} else {
				stillActive.push(user);
			}
		}

		return [expired, stillActive];
	}

	private async removeExpiredUsersForWorkflow(
		workflowId: Workflow['id'],
		expiredUsers: ActiveWorkflowUser[],
	) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		await Promise.all(
			expiredUsers.map(async (user) => await this.cache.deleteFromHash(cacheKey, user.userId)),
		);
	}

	private cacheHashToWorkflowActiveUsers(workflowCacheEntry: WorkflowCacheHash) {
		return Object.entries(workflowCacheEntry).map(([userId, lastSeen]) => ({
			userId,
			lastSeen,
		}));
	}

	private hasUserExpired(lastSeenString: Iso8601DateTimeString) {
		const expiryTime = new Date(lastSeenString).getTime() + this.inactivityCleanUpTime;

		return Date.now() > expiryTime;
	}
}
