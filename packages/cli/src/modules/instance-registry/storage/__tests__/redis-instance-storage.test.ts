import type { InstanceRegistration } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';
import { jsonStringify } from 'n8n-workflow';

import type { RedisClientService } from '@/services/redis-client.service';

import { REDIS_KEY_PATTERNS, REGISTRY_CONSTANTS } from '../../instance-registry.types';
import {
	CLEANUP_SCRIPT,
	READ_ALL_SCRIPT,
	REGISTER_SCRIPT,
	UNREGISTER_SCRIPT,
} from '../lua-scripts';
import { RedisInstanceStorage } from '../redis-instance-storage';

const PREFIX = 'n8n';

function createRegistration(overrides: Partial<InstanceRegistration> = {}): InstanceRegistration {
	return {
		schemaVersion: 1,
		instanceKey: 'main-abc123',
		hostId: 'host-1',
		instanceType: 'main',
		instanceRole: 'leader',
		version: '1.0.0',
		registeredAt: Date.now(),
		lastSeen: Date.now(),
		...overrides,
	};
}

describe('RedisInstanceStorage', () => {
	const client = mock<SingleNodeClient>();
	const logger = mockLogger();
	const globalConfig = mock<GlobalConfig>({ redis: { prefix: PREFIX } });
	const redisClientService = mock<RedisClientService>();
	redisClientService.createClient.mockReturnValue(client);

	let storage: RedisInstanceStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		storage = new RedisInstanceStorage(logger, globalConfig, redisClientService);
	});

	describe('constructor', () => {
		it('should create Redis client with command timeout', () => {
			expect(redisClientService.createClient).toHaveBeenCalledWith({
				type: 'registry(n8n)',
				extraOptions: { commandTimeout: REGISTRY_CONSTANTS.OPERATION_TIMEOUT_MS },
			});
		});

		it('should have kind "redis"', () => {
			expect(storage.kind).toBe('redis');
		});
	});

	describe('register', () => {
		it('should execute REGISTER_SCRIPT with correct keys and args', async () => {
			const registration = createRegistration();

			await storage.register(registration);

			expect(client.eval).toHaveBeenCalledWith(
				REGISTER_SCRIPT,
				2,
				REDIS_KEY_PATTERNS.instanceKey(PREFIX, registration.instanceKey),
				REDIS_KEY_PATTERNS.membershipSet(PREFIX),
				jsonStringify(registration),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);
		});

		it('should log warning on error', async () => {
			client.eval.mockRejectedValueOnce(new Error('connection lost'));
			const registration = createRegistration();

			await storage.register(registration);

			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Failed to register instance',
				expect.objectContaining({ instanceKey: registration.instanceKey }),
			);
		});
	});

	describe('heartbeat', () => {
		it('should execute REGISTER_SCRIPT (same as register)', async () => {
			const registration = createRegistration();

			await storage.heartbeat(registration);

			expect(client.eval).toHaveBeenCalledWith(
				REGISTER_SCRIPT,
				2,
				REDIS_KEY_PATTERNS.instanceKey(PREFIX, registration.instanceKey),
				REDIS_KEY_PATTERNS.membershipSet(PREFIX),
				jsonStringify(registration),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);
		});

		it('should log warning on error', async () => {
			client.eval.mockRejectedValueOnce(new Error('timeout'));
			const registration = createRegistration();

			await storage.heartbeat(registration);

			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Failed to heartbeat instance',
				expect.objectContaining({ instanceKey: registration.instanceKey }),
			);
		});
	});

	describe('unregister', () => {
		it('should execute UNREGISTER_SCRIPT with correct keys', async () => {
			await storage.unregister('main-abc123');

			expect(client.eval).toHaveBeenCalledWith(
				UNREGISTER_SCRIPT,
				2,
				REDIS_KEY_PATTERNS.instanceKey(PREFIX, 'main-abc123'),
				REDIS_KEY_PATTERNS.membershipSet(PREFIX),
			);
		});

		it('should log warning on error', async () => {
			client.eval.mockRejectedValueOnce(new Error('connection lost'));

			await storage.unregister('main-abc123');

			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Failed to unregister instance',
				expect.objectContaining({ instanceKey: 'main-abc123' }),
			);
		});
	});

	describe('getAllRegistrations', () => {
		it('should execute READ_ALL_SCRIPT and parse results', async () => {
			const reg1 = createRegistration({ instanceKey: 'main-1' });
			const reg2 = createRegistration({ instanceKey: 'worker-1', instanceType: 'worker' });
			client.eval.mockResolvedValueOnce([jsonStringify(reg1), jsonStringify(reg2)]);

			const result = await storage.getAllRegistrations();

			expect(client.eval).toHaveBeenCalledWith(
				READ_ALL_SCRIPT,
				1,
				REDIS_KEY_PATTERNS.membershipSet(PREFIX),
			);
			expect(result).toHaveLength(2);
			expect(result[0].instanceKey).toBe('main-1');
			expect(result[1].instanceKey).toBe('worker-1');
		});

		it('should skip invalid entries and log warning', async () => {
			const valid = createRegistration();
			client.eval.mockResolvedValueOnce([jsonStringify(valid), '{"invalid": true}']);

			const result = await storage.getAllRegistrations();

			expect(result).toHaveLength(1);
			expect(result[0].instanceKey).toBe(valid.instanceKey);
			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Skipping invalid registration entry',
				expect.any(Object),
			);
		});

		it('should skip malformed JSON entries without losing valid ones', async () => {
			const valid = createRegistration();
			client.eval.mockResolvedValueOnce([
				jsonStringify(valid),
				'not-json-at-all',
				jsonStringify(createRegistration({ instanceKey: 'worker-1', instanceType: 'worker' })),
			]);

			const result = await storage.getAllRegistrations();

			expect(result).toHaveLength(2);
			expect(result[0].instanceKey).toBe(valid.instanceKey);
			expect(result[1].instanceKey).toBe('worker-1');
			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Skipping malformed registration entry',
				expect.any(Object),
			);
		});

		it('should return empty array on empty result', async () => {
			client.eval.mockResolvedValueOnce([]);

			const result = await storage.getAllRegistrations();

			expect(result).toEqual([]);
		});

		it('should return empty array on error', async () => {
			client.eval.mockRejectedValueOnce(new Error('timeout'));

			const result = await storage.getAllRegistrations();

			expect(result).toEqual([]);
		});

		it('should preserve unknown fields via passthrough', async () => {
			const regWithExtra = { ...createRegistration(), futureField: 'hello' };
			client.eval.mockResolvedValueOnce([jsonStringify(regWithExtra)]);

			const result = await storage.getAllRegistrations();

			expect(result).toHaveLength(1);
			expect((result[0] as Record<string, unknown>).futureField).toBe('hello');
		});
	});

	describe('getRegistration', () => {
		it('should GET and validate registration', async () => {
			const reg = createRegistration();
			client.get.mockResolvedValueOnce(jsonStringify(reg));

			const result = await storage.getRegistration('main-abc123');

			expect(client.get).toHaveBeenCalledWith(
				REDIS_KEY_PATTERNS.instanceKey(PREFIX, 'main-abc123'),
			);
			expect(result).not.toBeNull();
			expect(result!.instanceKey).toBe('main-abc123');
		});

		it('should return null when key does not exist', async () => {
			client.get.mockResolvedValueOnce(null);

			const result = await storage.getRegistration('nonexistent');

			expect(result).toBeNull();
		});

		it('should return null and log warning for invalid data', async () => {
			client.get.mockResolvedValueOnce('{"not": "valid"}');

			const result = await storage.getRegistration('bad-key');

			expect(result).toBeNull();
			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Invalid registration data',
				expect.objectContaining({ instanceKey: 'bad-key' }),
			);
		});

		it('should return null for malformed JSON', async () => {
			client.get.mockResolvedValueOnce('not-valid-json');

			const result = await storage.getRegistration('bad-key');

			expect(result).toBeNull();
			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Failed to get registration',
				expect.objectContaining({ instanceKey: 'bad-key' }),
			);
		});

		it('should return null on error', async () => {
			client.get.mockRejectedValueOnce(new Error('timeout'));

			const result = await storage.getRegistration('main-abc123');

			expect(result).toBeNull();
		});
	});

	describe('getLastKnownState', () => {
		it('should return empty Map when key does not exist', async () => {
			client.get.mockResolvedValueOnce(null);

			const result = await storage.getLastKnownState();

			expect(result).toEqual(new Map());
		});

		it('should deserialize Map from JSON', async () => {
			const reg1 = createRegistration({ instanceKey: 'main-1' });
			const reg2 = createRegistration({ instanceKey: 'worker-1', instanceType: 'worker' });
			const record = { 'main-1': reg1, 'worker-1': reg2 };
			client.get.mockResolvedValueOnce(jsonStringify(record));

			const result = await storage.getLastKnownState();

			expect(result.size).toBe(2);
			expect(result.get('main-1')!.instanceKey).toBe('main-1');
			expect(result.get('worker-1')!.instanceType).toBe('worker');
		});

		it('should skip invalid entries in state', async () => {
			const valid = createRegistration({ instanceKey: 'main-1' });
			const record = { 'main-1': valid, 'bad-entry': { invalid: true } };
			client.get.mockResolvedValueOnce(jsonStringify(record));

			const result = await storage.getLastKnownState();

			expect(result.size).toBe(1);
			expect(result.has('main-1')).toBe(true);
		});

		it('should return empty Map on error', async () => {
			client.get.mockRejectedValueOnce(new Error('timeout'));

			const result = await storage.getLastKnownState();

			expect(result).toEqual(new Map());
		});
	});

	describe('saveLastKnownState', () => {
		it('should serialize Map and SET with TTL', async () => {
			const reg = createRegistration();
			const state = new Map([['main-abc123', reg]]);

			await storage.saveLastKnownState(state);

			expect(client.set).toHaveBeenCalledWith(
				REDIS_KEY_PATTERNS.stateKey(PREFIX),
				jsonStringify({ 'main-abc123': reg }),
				'EX',
				REGISTRY_CONSTANTS.STATE_TTL_SECONDS,
			);
		});

		it('should log warning on error', async () => {
			client.set.mockRejectedValueOnce(new Error('timeout'));

			await storage.saveLastKnownState(new Map());

			expect(logger.scoped(['instance-registry', 'redis']).warn).toHaveBeenCalledWith(
				'Failed to save last known state',
				expect.any(Object),
			);
		});
	});

	describe('destroy', () => {
		it('should disconnect the Redis client', async () => {
			await storage.destroy();

			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('cleanupStaleMembers', () => {
		it('should execute CLEANUP_SCRIPT and return count', async () => {
			client.eval.mockResolvedValueOnce(3);

			const result = await storage.cleanupStaleMembers();

			expect(client.eval).toHaveBeenCalledWith(
				CLEANUP_SCRIPT,
				1,
				REDIS_KEY_PATTERNS.membershipSet(PREFIX),
			);
			expect(result).toBe(3);
		});

		it('should return 0 on error', async () => {
			client.eval.mockRejectedValueOnce(new Error('timeout'));

			const result = await storage.cleanupStaleMembers();

			expect(result).toBe(0);
		});
	});
});
