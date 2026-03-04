import type { Variables } from '@n8n/db';
import { VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/logging';

import { CacheService } from '@/services/cache/cache.service';

/**
 * Service to monitor and maintain the health of the variables cache.
 * Ensures cache consistency between Redis and PostgreSQL in queue mode.
 */
@Service()
export class VariablesCacheHealthService {
	private healthCheckInterval: NodeJS.Timeout | null = null;

	private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // 1 minute

	constructor(
		private readonly cacheService: CacheService,
		private readonly variablesRepository: VariablesRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Start periodic health checks for the variables cache.
	 * This helps detect and recover from stale or empty cache states.
	 */
	startHealthChecks(): void {
		if (this.healthCheckInterval) {
			this.logger.debug('Variables cache health checks already running');
			return;
		}

		this.logger.info('Starting variables cache health checks');

		this.healthCheckInterval = setInterval(async () => {
			try {
				await this.performHealthCheck();
			} catch (error) {
				this.logger.error('Variables cache health check failed', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}, this.HEALTH_CHECK_INTERVAL_MS);
	}

	/**
	 * Stop periodic health checks.
	 */
	stopHealthChecks(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
			this.logger.info('Stopped variables cache health checks');
		}
	}

	/**
	 * Perform a health check on the variables cache.
	 * Compares cache state with database state and repairs if necessary.
	 */
	async performHealthCheck(): Promise<{ healthy: boolean; repaired: boolean }> {
		const cachedVariables = await this.cacheService.get<Variables[]>('variables');
		const dbVariables = await this.variablesRepository.find({ relations: ['project'] });

		const cacheCount = cachedVariables?.length ?? 0;
		const dbCount = dbVariables.length;

		// Check if cache is empty but database has variables
		if (cacheCount === 0 && dbCount > 0) {
			this.logger.warn('Variables cache is empty but database has variables - repairing cache', {
				dbCount,
			});

			await this.cacheService.set('variables', dbVariables);

			return { healthy: false, repaired: true };
		}

		// Check if cache count doesn't match database count
		if (cacheCount !== dbCount) {
			this.logger.warn('Variables cache count mismatch with database - repairing cache', {
				cacheCount,
				dbCount,
			});

			await this.cacheService.set('variables', dbVariables);

			return { healthy: false, repaired: true };
		}

		// Cache appears healthy
		return { healthy: true, repaired: false };
	}

	/**
	 * Verify cache integrity and repair if necessary.
	 * Returns true if cache was healthy or successfully repaired.
	 */
	async verifyCacheIntegrity(): Promise<boolean> {
		const result = await this.performHealthCheck();

		if (!result.healthy && !result.repaired) {
			this.logger.error('Failed to repair variables cache');
			return false;
		}

		return true;
	}
}
