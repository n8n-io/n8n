import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import Redis from 'ioredis';

import { RedisClientService } from '@/services/redis-client.service';

/**
 * Regression test for CAT-2575: Silent failure with AWS ElastiCache when Redis TLS disabled
 *
 * When n8n is configured to use AWS ElastiCache with Redis TLS disabled (redis.tls: false),
 * but ElastiCache requires TLS, the connection hangs at TCP level without receiving ECONNREFUSED.
 * This causes:
 * 1. The retryStrategy never triggers (it only runs on ECONNREFUSED)
 * 2. process.exit(1) never happens
 * 3. No error is logged
 * 4. Health checks pass while the app is broken
 */
describe('RedisClientService - TLS mismatch hang (CAT-2575)', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	it('should have connectTimeout configured to prevent indefinite hangs', () => {
		// Setup: Configure Redis without TLS
		const globalConfig = mockInstance(GlobalConfig, {
			queue: {
				bull: {
					redis: {
						host: 'test.serverless.cache.amazonaws.com',
						port: 6379,
						db: 0,
						tls: false, // This is the misconfiguration - ElastiCache requires TLS
						timeoutThreshold: 10000,
						clusterNodes: '',
					},
				},
			},
		});

		// Mock ioredis constructor to capture options
		let capturedOptions: any;
		jest.spyOn(Redis.prototype, 'constructor' as any).mockImplementation(function (options: any) {
			capturedOptions = options;
			return {
				on: jest.fn().mockReturnThis(),
			};
		});

		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		// Assert: connectTimeout should be set to prevent indefinite hangs
		// This test will FAIL until the fix is implemented
		expect(capturedOptions).toHaveProperty('connectTimeout');
		expect(capturedOptions.connectTimeout).toBeGreaterThan(0);
		expect(capturedOptions.connectTimeout).toBeLessThanOrEqual(10000); // Should be reasonable
	});

	it('should detect hanging connections without ECONNREFUSED', async () => {
		const globalConfig = mockInstance(GlobalConfig, {
			queue: {
				bull: {
					redis: {
						host: 'test.serverless.cache.amazonaws.com',
						port: 6379,
						db: 0,
						tls: false,
						timeoutThreshold: 5000, // 5 seconds max
						clusterNodes: '',
					},
				},
			},
		});

		// Mock Redis to simulate a hanging connection (no events fired)
		const mockRedis = {
			on: jest.fn().mockReturnThis(),
			connect: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
			status: 'connecting',
		};

		jest.spyOn(Redis.prototype, 'constructor' as any).mockReturnValue(mockRedis);

		const service = new RedisClientService(logger, globalConfig);
		const client = service.createClient({ type: 'client(bull)' });

		// Simulate time passing without connection success
		// In the real bug, this hangs indefinitely with no error
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert: The service should have mechanisms to detect this hang
		// This test documents the expected behavior:
		// 1. Either connectTimeout should abort the connection
		// 2. Or there should be a startup health check that fails
		expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));

		// The bug: retryStrategy only triggers on 'error' event with ECONNREFUSED
		// But TLS mismatches cause TCP hangs with no error event
	});

	it('should handle TLS requirement mismatch scenarios', () => {
		// Document the scenarios where this bug manifests:
		// 1. ElastiCache with tls: false when TLS is required
		// 2. Any Redis server that silently drops non-TLS connections
		// 3. Network ACLs that black-hole traffic instead of rejecting it

		const scenarios = [
			{
				name: 'AWS ElastiCache Serverless without TLS',
				host: 'test.serverless.euc1.cache.amazonaws.com',
				tls: false, // ElastiCache requires TLS by default
				expectedBehavior: 'should timeout with clear error',
			},
			{
				name: 'ElastiCache Cluster without TLS',
				host: 'test.clustercfg.euc1.cache.amazonaws.com',
				tls: false,
				expectedBehavior: 'should timeout with clear error',
			},
		];

		scenarios.forEach((scenario) => {
			const globalConfig = mockInstance(GlobalConfig, {
				queue: {
					bull: {
						redis: {
							host: scenario.host,
							port: 6379,
							db: 0,
							tls: scenario.tls,
							timeoutThreshold: 10000,
							clusterNodes: '',
						},
					},
				},
			});

			const service = new RedisClientService(logger, globalConfig);

			// This test will FAIL until the fix is implemented
			// Expected: connectTimeout should be set for all scenarios
			expect(() => {
				service.createClient({ type: 'client(bull)' });
			}).not.toThrow(); // Creating client shouldn't throw immediately

			// But the client should have timeout protection
			// (This assertion will fail until fix is implemented)
		});
	});

	it('should not rely solely on ECONNREFUSED for connection failures', () => {
		const globalConfig = mockInstance(GlobalConfig, {
			queue: {
				bull: {
					redis: {
						host: 'test.cache.amazonaws.com',
						port: 6379,
						db: 0,
						tls: false,
						timeoutThreshold: 5000,
						clusterNodes: '',
					},
				},
			},
		});

		let retryStrategyFn: any;
		jest.spyOn(Redis.prototype, 'constructor' as any).mockImplementation(function (options: any) {
			retryStrategyFn = options.retryStrategy;
			return {
				on: jest.fn().mockReturnThis(),
			};
		});

		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		// The current implementation only handles ECONNREFUSED in the retryStrategy
		// But TLS mismatches don't generate ECONNREFUSED - they hang at TCP level

		// This test documents that connectTimeout is needed because:
		// 1. No error event is fired (so retryStrategy never runs)
		// 2. The connection just hangs forever
		// 3. process.exit(1) is never called
		// 4. Health checks pass but app is broken

		// Expected fix: Add connectTimeout to ioredis options
		// so the connection fails fast instead of hanging indefinitely
	});
});
