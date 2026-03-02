/**
 * Internal constants for instance registry timing and configuration
 */
export const REGISTRY_CONSTANTS = {
	HEARTBEAT_INTERVAL_MS: 30_000, // 30 seconds
	REGISTRATION_TTL_SECONDS: 60, // 60 seconds
	RECONCILIATION_INTERVAL_MS: 180_000, // 3 minutes
	OPERATION_TIMEOUT_MS: 5_000, // 5 seconds
} as const;

/**
 * Redis key patterns using hash tags for Redis Cluster compatibility
 * Hash tag {instance:} ensures all keys land in same slot for atomic operations
 */
export const REDIS_KEY_PATTERNS = {
	instanceKey: (prefix: string, instanceKey: string) => `${prefix}:{instance:}${instanceKey}`,
	membershipSet: (prefix: string) => `${prefix}:{instance:}members`,
	stateKey: (prefix: string) => `${prefix}:{instance:}:state`,
} as const;
