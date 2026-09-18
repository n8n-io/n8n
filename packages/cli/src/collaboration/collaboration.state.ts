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
 * Lua scripts for atomic lock operations on Redis. These run entirely on
 * the Redis server, so they are race-free across multiple n8n mains sharing
 * the same Redis — unlike the in-memory `serializeLockOp` which only
 * serializes within a single process.
 *
 * The cache stores values double-JSON-encoded: `cache.set(key, JSON.stringify(obj))`
 * → Redis stores `JSON.stringify(JSON.stringify(obj))`. The scripts
 * `cjson.decode` twice to recover the object, and `SET` with a
 * double-encoded value produced in TypeScript.
 */

// SET if absent or already held by the same clientId. Returns 1 on success, 0 if held by another client.
const ACQUIRE_LOCK_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then
  local ok, decoded = pcall(cjson.decode, current)
  if not ok then return 0 end
  local ok2, lock = pcall(cjson.decode, decoded)
  if not ok2 then return 0 end
  if lock.clientId ~= ARGV[2] then return 0 end
end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[3])
return 1
`;

// SET if absent or held by the same userId (force-steal from same user's other tab).
const ACQUIRE_LOCK_FORCE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then
  local ok, decoded = pcall(cjson.decode, current)
  if not ok then return 0 end
  local ok2, lock = pcall(cjson.decode, decoded)
  if not ok2 then return 0 end
  if lock.userId ~= ARGV[2] then return 0 end
end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[3])
return 1
`;

// PEXPIRE only if the caller holds the lock (clientId matches).
const RENEW_LOCK_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local ok, decoded = pcall(cjson.decode, current)
if not ok then return 0 end
local ok2, lock = pcall(cjson.decode, decoded)
if not ok2 then return 0 end
if lock.clientId ~= ARGV[2] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`;

// DEL only if the caller holds the lock (clientId matches).
const RELEASE_LOCK_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local ok, decoded = pcall(cjson.decode, current)
if not ok then return 0 end
local ok2, lock = pcall(cjson.decode, decoded)
if not ok2 then return 0 end
if lock.clientId ~= ARGV[2] then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

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

	private async serializeLockOp<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const previous = this.lockChains.get(key) ?? Promise.resolve();
		const next = previous.then(fn, fn);
		// Keep the chain alive for the next op, but don't reject the chain
		// if this op throws — the caller still sees the real error.
		const settled = next.catch(() => {});
		this.lockChains.set(key, settled);
		// Remove the entry once it settles so long-lived instances don't
		// accumulate one chain per resource ever opened. Only delete if
		// the map still points at this chain.
		void settled.then(() => {
			if (this.lockChains.get(key) === settled) {
				this.lockChains.delete(key);
			}
		});
		return await next;
	}

	/**
	 * Whether the cache backend is Redis. When true, lock operations use
	 * atomic Lua scripts (race-free across mains); when false, they fall
	 * back to the in-memory `serializeLockOp` (single-process only).
	 */
	private isRedis() {
		return this.cache.isRedis();
	}

	/**
	 * Encode lock data for Redis storage. `CacheService.set` JSON-encodes
	 * the value, and `setAgentWriteLock` passes a JSON string, so the
	 * value in Redis is double-encoded. Lua scripts must `SET` the same
	 * format to stay compatible with `getAgentWriteLock`.
	 */
	private encodeLockData(lockData: { clientId: string; userId: string }): string {
		return JSON.stringify(JSON.stringify(lockData));
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
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		if (this.isRedis()) {
			const encoded = this.encodeLockData({ clientId, userId });
			const result = await this.cache.eval(
				ACQUIRE_LOCK_SCRIPT,
				[cacheKey],
				[encoded, clientId, this.writeLockTtl],
			);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
			const current = await this.getWriteLock(workflowId);
			if (current && current.clientId !== clientId) return false;
			await this.setWriteLock(workflowId, clientId, userId);
			return true;
		});
	}

	async renewWriteLock(workflowId: Workflow['id'], clientId: string) {
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		if (this.isRedis()) {
			await this.cache.eval(RENEW_LOCK_SCRIPT, [cacheKey], [clientId, this.writeLockTtl]);
			return;
		}
		await this.serializeLockOp(cacheKey, async () => {
			const currentLock = await this.getWriteLock(workflowId);
			if (currentLock?.clientId === clientId) {
				const lockData = JSON.stringify(currentLock);
				await this.cache.set(cacheKey, lockData, this.writeLockTtl);
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
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		if (this.isRedis()) {
			const result = await this.cache.eval(RELEASE_LOCK_SCRIPT, [cacheKey], [clientId]);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
			const current = await this.getWriteLock(workflowId);
			if (current?.clientId !== clientId) return false;
			await this.cache.delete(cacheKey);
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
		const cacheKey = this.formWriteLockCacheKey(workflowId);
		if (this.isRedis()) {
			const encoded = this.encodeLockData({ clientId, userId });
			const result = await this.cache.eval(
				ACQUIRE_LOCK_FORCE_SCRIPT,
				[cacheKey],
				[encoded, userId, this.writeLockTtl],
			);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
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
	 * Uses a Redis Lua script when Redis is the cache backend (atomic
	 * across mains); falls back to in-process serialization for memory.
	 */
	async acquireAgentWriteLock(
		agentId: string,
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		if (this.isRedis()) {
			const encoded = this.encodeLockData({ clientId, userId });
			const result = await this.cache.eval(
				ACQUIRE_LOCK_SCRIPT,
				[cacheKey],
				[encoded, clientId, this.writeLockTtl],
			);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
			const current = await this.getAgentWriteLock(agentId);
			if (current && current.clientId !== clientId) return false;
			await this.setAgentWriteLock(agentId, clientId, userId);
			return true;
		});
	}

	async renewAgentWriteLock(agentId: string, clientId: string) {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		if (this.isRedis()) {
			await this.cache.eval(RENEW_LOCK_SCRIPT, [cacheKey], [clientId, this.writeLockTtl]);
			return;
		}
		await this.serializeLockOp(cacheKey, async () => {
			const currentLock = await this.getAgentWriteLock(agentId);
			if (currentLock?.clientId === clientId) {
				const lockData = JSON.stringify(currentLock);
				await this.cache.set(cacheKey, lockData, this.writeLockTtl);
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
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		if (this.isRedis()) {
			const result = await this.cache.eval(RELEASE_LOCK_SCRIPT, [cacheKey], [clientId]);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
			const current = await this.getAgentWriteLock(agentId);
			if (current?.clientId !== clientId) return false;
			await this.cache.delete(cacheKey);
			return true;
		});
	}

	private formAgentWriteLockCacheKey(agentId: string) {
		return `collaboration:write-lock:agent:${agentId}`;
	}

	/**
	 * Acquire agent write lock forcefully, stealing from same user's other tab.
	 * Uses a Redis Lua script when Redis is the cache backend (atomic
	 * across mains); falls back to in-process serialization for memory.
	 *
	 * @returns true if lock was acquired, false if lock is held by different user
	 */
	async acquireAgentWriteLockForce(
		agentId: string,
		clientId: string,
		userId: User['id'],
	): Promise<boolean> {
		const cacheKey = this.formAgentWriteLockCacheKey(agentId);
		if (this.isRedis()) {
			const encoded = this.encodeLockData({ clientId, userId });
			const result = await this.cache.eval(
				ACQUIRE_LOCK_FORCE_SCRIPT,
				[cacheKey],
				[encoded, userId, this.writeLockTtl],
			);
			return result === 1;
		}
		return await this.serializeLockOp(cacheKey, async () => {
			const currentLock = await this.getAgentWriteLock(agentId);
			if (currentLock && currentLock.userId !== userId) return false;
			await this.setAgentWriteLock(agentId, clientId, userId);
			return true;
		});
	}
}
