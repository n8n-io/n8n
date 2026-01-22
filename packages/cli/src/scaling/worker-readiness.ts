import type { DbConnection } from '@n8n/db';

import type { RedisClientService } from '@/services/redis-client.service';

/**
 * Check if worker is ready (DB connected and migrated, Redis connected).
 * Shared by health check endpoints and health monitor.
 */
export function checkWorkerReadiness(
	dbConnection: DbConnection,
	redisClientService: RedisClientService,
) {
	const { connectionState } = dbConnection;

	return connectionState.connected && connectionState.migrated && redisClientService.isConnected();
}
