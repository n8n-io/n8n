export interface EngineConfig {
	/** Redis URL for cross-instance event relay. If undefined, uses in-process relay. */
	redisUrl?: string;

	/** Maximum concurrent step executions per instance. Default: 10 */
	maxConcurrency?: number;

	/** Unique instance identifier. Auto-generated if not provided. */
	instanceId?: string;

	/** Redis channel prefix. Default: 'default'. Prevents cross-contamination when multiple deployments share one Redis. */
	redisChannelPrefix?: string;
}
