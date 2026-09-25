import { LockNamespace } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { OperationalError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import { RedisLockService } from '../redis-lock.service';

const PREFIX = 'n8n';
const NS = LockNamespace.CREDENTIALS;

const expectedKey = (key: string) =>
	`${PREFIX}:lock:${NS}:${createHash('sha256').update(key).digest('hex')}`;

const flush = async () => await Promise.resolve();

describe('RedisLockService', () => {
	const client = mock<SingleNodeClient>();
	const logger = mockLogger();
	const globalConfig = mock<GlobalConfig>({ redis: { prefix: PREFIX } });
	const redisClientService = mock<RedisClientService>();
	redisClientService.toValidPrefix.mockImplementation((prefix) => prefix);
	redisClientService.createClient.mockReturnValue(client);

	let service: RedisLockService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new RedisLockService(logger, globalConfig, redisClientService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('constructor', () => {
		it('should create a dedicated lock client with a command timeout', () => {
			expect(redisClientService.createClient).toHaveBeenCalledWith({
				type: 'lock(n8n)',
				extraOptions: { commandTimeout: 5_000 },
			});
		});
	});

	describe('withLease', () => {
		it('should acquire with NX/PX, run fn, then release with the owner token', async () => {
			client.set.mockResolvedValue('OK');
			client.eval.mockResolvedValue(1);
			const fn = vi.fn().mockResolvedValue('result');

			const result = await service.withLease(NS, 'my-key', fn);

			expect(result).toBe('result');

			const [key, token, px, ttl, nx] = client.set.mock.calls[0];
			expect(key).toBe(expectedKey('my-key'));
			expect(typeof token).toBe('string');
			expect([px, ttl, nx]).toEqual(['PX', 30_000, 'NX']);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(client.eval).toHaveBeenCalledWith(
				expect.stringContaining('del'),
				1,
				expectedKey('my-key'),
				token,
			);
		});

		it('should use a caller-supplied leaseTtlMs', async () => {
			client.set.mockResolvedValue('OK');
			client.eval.mockResolvedValue(1);

			await service.withLease(NS, 'k', vi.fn(), { leaseTtlMs: 5_000 });

			expect(client.set).toHaveBeenCalledWith(
				expectedKey('k'),
				expect.any(String),
				'PX',
				5_000,
				'NX',
			);
		});

		it('should throw OperationalError and never run fn when waiting times out', async () => {
			client.set.mockResolvedValue(null); // never acquired
			const fn = vi.fn();

			await expect(service.withLease(NS, 'k', fn, { waitTimeoutMs: 50 })).rejects.toThrow(
				OperationalError,
			);
			expect(fn).not.toHaveBeenCalled();
		});

		it('should release the lock when fn throws and propagate the error', async () => {
			client.set.mockResolvedValue('OK');
			client.eval.mockResolvedValue(1);
			const fn = vi.fn().mockRejectedValue(new Error('boom'));

			await expect(service.withLease(NS, 'k', fn)).rejects.toThrow('boom');
			expect(client.eval).toHaveBeenCalledWith(
				expect.stringContaining('del'),
				1,
				expect.any(String),
				expect.any(String),
			);
		});

		it('should still return fn result when release fails (best-effort)', async () => {
			client.set.mockResolvedValue('OK');
			client.eval.mockRejectedValue(new Error('redis down'));
			const fn = vi.fn().mockResolvedValue('result');

			expect(await service.withLease(NS, 'k', fn)).toBe('result');
			expect(logger.warn).toHaveBeenCalled();
		});

		it('should renew the lease via watchdog and abort the signal when the lock is lost', async () => {
			vi.useFakeTimers();
			client.set.mockResolvedValue('OK');

			// Distinguish renewal (PEXPIRE) from release (del): renew succeeds once, then loses.
			let renewals = 0;
			client.eval.mockImplementation(async (script: unknown) => {
				if (typeof script === 'string' && script.includes('PEXPIRE')) {
					renewals += 1;
					return renewals >= 2 ? 0 : 1;
				}
				return 1; // release
			});

			let signal!: AbortSignal;
			let resolveFn!: (v: string) => void;
			const fn = vi.fn(async (s: AbortSignal) => {
				signal = s;
				return await new Promise<string>((r) => {
					resolveFn = r;
				});
			});

			// leaseTtlMs 300 => watchdog interval 100ms
			const p = service.withLease(NS, 'k', fn, { leaseTtlMs: 300 });
			await flush(); // let acquire resolve and fn run

			await vi.advanceTimersByTimeAsync(100); // renewal #1 -> ok
			expect(signal.aborted).toBe(false);

			await vi.advanceTimersByTimeAsync(100); // renewal #2 -> lost
			expect(signal.aborted).toBe(true);

			resolveFn('done');
			expect(await p).toBe('done');
		});
	});
});
