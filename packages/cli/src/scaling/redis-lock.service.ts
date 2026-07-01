import {
	type ILockService,
	type LockNamespace,
	LockAcquisitionTimeoutError,
	Logger,
} from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { ensureError } from 'n8n-workflow';
import { createHash, randomUUID } from 'node:crypto';

import { RedisClientService } from '@/services/redis-client.service';
import { OnShutdown } from '@n8n/decorators';

const COMMAND_TIMEOUT_MS = 5_000;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

const EXTENDED_RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
    return 0
end
`;

@Service()
export class RedisLockService implements ILockService {
	private readonly redisClient: Redis | Cluster;

	private readonly lockPrefix: string;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		redisClientService: RedisClientService,
	) {
		const prefix = redisClientService.toValidPrefix(globalConfig.redis.prefix);
		this.lockPrefix = prefix + ':lock';

		this.redisClient = redisClientService.createClient({
			type: 'lock(n8n)',
			extraOptions: { commandTimeout: COMMAND_TIMEOUT_MS },
		});
	}

	private buildLockKey(ns: LockNamespace, key: string): string {
		const hash = createHash('sha256').update(key).digest('hex');
		return `${this.lockPrefix}:${ns}:${hash}`;
	}

	async withLease<T>(
		ns: LockNamespace,
		key: string,
		fn: (signal: AbortSignal) => Promise<T>,
		options?: { waitTimeoutMs?: number; leaseTtlMs?: number },
	): Promise<T> {
		const abortController = new AbortController();
		const lockKey = this.buildLockKey(ns, key);
		const lockValue = randomUUID();
		const lease = options?.leaseTtlMs ?? 30_000;

		let acquireErrorLogged = false;
		const acquireLock = async (): Promise<boolean> => {
			try {
				const result = await this.redisClient.set(lockKey, lockValue, 'PX', lease, 'NX');
				return result === 'OK';
			} catch (error) {
				if (!acquireErrorLogged) {
					this.logger.warn('Failed to acquire lock; retrying', { key, error: ensureError(error) });
					acquireErrorLogged = true;
				}
				return false;
			}
		};

		const releaseLock = async (): Promise<void> => {
			try {
				const result = await this.redisClient.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockValue);
				if (result !== 1) {
					// We didn't hold it at release time — lease expired and possibly another
					// worker has the lock. Means fn() ran longer than the lease could be renewed.
					this.logger.warn('Lock was no longer held at release time', { key });
				}
			} catch (error) {
				// Best-effort: the lease (PX) expires on its own. Never let a release
				// error overwrite a successful fn() result.
				this.logger.warn('Failed to release lock; relying on lease expiry', {
					key,
					error: ensureError(error),
				});
			}
		};

		const startWatchdog = (): NodeJS.Timeout => {
			let lastRenewedAt = Date.now();
			const timer = setInterval(
				() => {
					void (async () => {
						try {
							const result = await this.redisClient.eval(
								EXTENDED_RELEASE_LOCK_SCRIPT,
								1,
								lockKey,
								lockValue,
								lease,
							);
							if (result === 1) {
								lastRenewedAt = Date.now();
								return;
							}
							// Lost the lock: expired before renewal, or another worker took it.
							// Can't cancel fn(), so just stop renewing and warn.
							this.logger.warn('Lost lock during execution; stopping renewal', { key });
							clearInterval(timer);
							abortController.abort();
						} catch (error) {
							// Transient error: keep retrying, but only while the lease could still
							// be alive. Past that point another worker may hold the lock.
							if (Date.now() - lastRenewedAt >= lease) {
								this.logger.warn('Lock renewal failing past lease window; aborting', {
									key,
									error: ensureError(error),
								});
								clearInterval(timer);
								abortController.abort();
							} else {
								this.logger.warn('Lock renewal failed; will retry', {
									key,
									error: ensureError(error),
								});
							}
						}
					})();
				},
				Math.max(1, Math.floor(lease / 3)),
			);

			timer.unref(); // never keep the process alive just for renewal
			return timer;
		};

		const startTime = Date.now();
		while (true) {
			if (await acquireLock()) {
				const watchdog = startWatchdog();
				try {
					return await fn(abortController.signal);
				} finally {
					clearInterval(watchdog);
					abortController.abort();
					await releaseLock();
				}
			}

			if (options?.waitTimeoutMs !== undefined && Date.now() - startTime > options.waitTimeoutMs) {
				throw new LockAcquisitionTimeoutError(
					`Timed out waiting for lock '${key}' in namespace '${ns}' after ${options.waitTimeoutMs}ms`,
				);
			}

			const jitter = Math.floor(Math.random() * 50); // Random jitter to avoid thundering herd

			await new Promise((resolve) => setTimeout(resolve, 50 + jitter)); // Wait before retrying
		}
	}

	/** Disconnect the underlying Redis client. */
	@OnShutdown()
	destroy() {
		this.redisClient.disconnect();
	}
}
