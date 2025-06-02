import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';
import { ErrorReporter } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import type { Pool, PoolClient } from 'pg';

// Internal structure of pg Pool and Client for connection recovery
// These are not part of the public API but are needed for advanced recovery
export interface InternalPoolClient extends PoolClient {
	_ended?: boolean;
	_ending?: boolean;
}

export interface InternalPool extends Pool {
	_clients?: Array<InternalPoolClient | null>;
}

@Service()
export class PgRecover {
	constructor(
		private readonly dataSource: DataSource,
		private readonly errorReporter: ErrorReporter,
		private readonly logger: Logger,
	) {}

	initializeRecoverOnError() {
		const pgDriver = this.dataSource.driver;
		if (!(pgDriver instanceof PostgresDriver) || !this.dataSource.isInitialized) return;

		const pgPool = pgDriver.master as Pool;
		pgPool.on('error', async (error) => {
			this.logger.debug(`Postgres pool error: ${ensureError(error).message}`);
			// Log the current pool state
			this.logger.debug(
				`Recovering connection pool. Total: ${pgPool.totalCount}, Idle: ${pgPool.idleCount}, Waiting: ${pgPool.waitingCount}`,
			);
			// Attempt to recover the connection pool
			const recoveryAttempted = await this.recoverConnectionPool(pgPool);
			if (recoveryAttempted) {
				this.logger.debug('Connection pool recovery attempted');
			} else {
				this.logger.debug('Failed to recover connection pool');
			}
		});
	}

	/**
	 * Attempt to recover the connection pool when it's in an unhealthy state
	 * This method will try to release any stalled connections and create new ones
	 * @returns True if recovery was attempted, false otherwise
	 */
	private async recoverConnectionPool(pgPool: Pool): Promise<boolean> {
		if (!this.dataSource.isInitialized) {
			return false;
		}

		try {
			// Access the internal pool structure to find stalled connections
			// Note: This uses internal properties that are not part of the public API
			// but necessary for our specific use case of recovering from stalled connections
			const internalPool = pgPool as InternalPool;
			if (internalPool._clients && Array.isArray(internalPool._clients)) {
				this.logger.debug('Recovering connection pool...');
				let releasedCount = 0;
				const clients = internalPool._clients;

				for (let i = 0; i < clients.length; i++) {
					const client = clients[i];
					this.logger.debug(`Checking client at index ${i}: ${client?._ended}`);
					// Check if the client is in an ended state but still in the pool
					if (client && (client._ended === true || client._ending === true)) {
						// Properly release the client instead of just setting it to null
						this.logger.debug(`Found stalled connection at index ${i}, properly releasing it`);
						try {
							// Force release the client (true parameter forces termination)
							client.release(true);
						} catch (error) {
							// If release fails, manually remove it from the pool
							this.logger.debug(
								`Failed to release client, removing from pool: ${ensureError(error).message}`,
							);
							clients[i] = null;
						}
						releasedCount++;
					}
				}

				if (releasedCount > 0) {
					this.errorReporter.info(`Released ${releasedCount} stalled connections from the pool`);
				}
			}

			return true;
		} catch (error) {
			this.errorReporter.error(`Failed to recover connection pool: ${ensureError(error).message}`);
			return false;
		}
	}
}
