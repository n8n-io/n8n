import type { InstanceRegistration } from '@n8n/api-types';

/**
 * Storage abstraction for instance registrations
 * Implementations: RedisInstanceStorage, MemoryInstanceStorage
 */
export interface InstanceStorage {
	/** Tagged union discriminator for runtime type checking */
	kind: 'redis' | 'memory';

	/**
	 * Register a new instance on startup
	 * Redis: SET with TTL + SADD to membership set
	 * Memory: Store in local variable
	 */
	register(registration: InstanceRegistration): Promise<void>;

	/**
	 * Refresh instance registration (called every 30s)
	 * Redis: Refresh TTL + update payload
	 * Memory: Update local variable
	 */
	heartbeat(registration: InstanceRegistration): Promise<void>;

	/**
	 * Unregister instance on shutdown
	 * Redis: DEL key + SREM from membership set
	 * Memory: Clear local variable
	 */
	unregister(instanceKey: string): Promise<void>;

	/**
	 * Get all active registrations
	 * Redis: SMEMBERS + MGET (atomic via Lua)
	 * Memory: Return array with single local registration
	 */
	getAllRegistrations(): Promise<InstanceRegistration[]>;

	/**
	 * Get specific registration by instance key
	 * Redis: GET key
	 * Memory: Return local if matches key
	 */
	getRegistration(instanceKey: string): Promise<InstanceRegistration | null>;

	/**
	 * Get leader's last known state (for diff computation)
	 * Redis: GET state key
	 * Memory: Return in-memory map
	 */
	getLastKnownState(): Promise<Map<string, InstanceRegistration>>;

	/**
	 * Save leader's state (for leadership handoffs)
	 * Redis: SET state key with TTL
	 * Memory: Update in-memory map
	 */
	saveLastKnownState(state: Map<string, InstanceRegistration>): Promise<void>;

	/**
	 * Remove stale entries from membership set
	 * Redis: Compare SET members with key existence, remove stale
	 * Memory: No-op, returns 0
	 */
	cleanupStaleMembers(): Promise<number>;
}
