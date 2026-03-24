import type { InstanceRegistration } from '@n8n/api-types';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import ioRedis from 'ioredis';
import { jsonStringify } from 'n8n-workflow';

import { REDIS_KEY_PATTERNS, REGISTRY_CONSTANTS } from '../../instance-registry.types';
import {
	CLEANUP_SCRIPT,
	READ_ALL_SCRIPT,
	REGISTER_SCRIPT,
	UNREGISTER_SCRIPT,
} from '../lua-scripts';

const PREFIX = 'test';

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

function instanceKey(key: string) {
	return REDIS_KEY_PATTERNS.instanceKey(PREFIX, key);
}

function membershipSetKey() {
	return REDIS_KEY_PATTERNS.membershipSet(PREFIX);
}

describe('Redis Lua Scripts Integration', () => {
	let container: StartedRedisContainer;
	let client: ioRedis;

	beforeAll(async () => {
		container = await new RedisContainer('redis:alpine').start();
		client = new ioRedis({
			host: container.getHost(),
			port: container.getMappedPort(6379),
			maxRetriesPerRequest: null,
		});
	}, 30_000);

	afterAll(async () => {
		if (client) await client.quit();
		if (container) await container.stop();
	});

	afterEach(async () => {
		if (client) await client.flushall();
	});

	describe('REGISTER_SCRIPT', () => {
		it('should atomically SET key with TTL and SADD to membership set', async () => {
			const reg = createRegistration();

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey(reg.instanceKey),
				membershipSetKey(),
				jsonStringify(reg),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			const stored = await client.get(instanceKey(reg.instanceKey));
			expect(stored).not.toBeNull();
			expect(JSON.parse(stored!).instanceKey).toBe('main-abc123');

			const members = await client.smembers(membershipSetKey());
			expect(members).toContain(instanceKey(reg.instanceKey));

			const ttl = await client.ttl(instanceKey(reg.instanceKey));
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS);
		});

		it('should update existing registration on re-register', async () => {
			const reg1 = createRegistration({ instanceRole: 'follower' });
			const reg2 = createRegistration({ instanceRole: 'leader' });

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey(reg1.instanceKey),
				membershipSetKey(),
				jsonStringify(reg1),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey(reg2.instanceKey),
				membershipSetKey(),
				jsonStringify(reg2),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			const stored = await client.get(instanceKey(reg2.instanceKey));
			expect(JSON.parse(stored!).instanceRole).toBe('leader');

			const members = await client.smembers(membershipSetKey());
			expect(members).toHaveLength(1);
		});
	});

	describe('READ_ALL_SCRIPT', () => {
		it('should return all active registrations', async () => {
			const reg1 = createRegistration({ instanceKey: 'main-1' });
			const reg2 = createRegistration({ instanceKey: 'worker-1', instanceType: 'worker' });

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(reg1),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);
			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('worker-1'),
				membershipSetKey(),
				jsonStringify(reg2),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			const results = (await client.eval(
				READ_ALL_SCRIPT,
				1,
				membershipSetKey(),
			)) as string[];

			expect(results).toHaveLength(2);
			const parsed = results.map((r) => JSON.parse(r));
			const keys = parsed.map((p: InstanceRegistration) => p.instanceKey).sort();
			expect(keys).toEqual(['main-1', 'worker-1']);
		});

		it('should return empty array when no members exist', async () => {
			const results = await client.eval(READ_ALL_SCRIPT, 1, membershipSetKey());

			expect(results).toEqual([]);
		});

		it('should filter out expired keys', async () => {
			const reg = createRegistration({ instanceKey: 'main-1' });

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(reg),
				'1', // 1 second TTL
			);

			// Wait for expiry
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const results = (await client.eval(
				READ_ALL_SCRIPT,
				1,
				membershipSetKey(),
			)) as string[];

			// Key expired but membership set still has the entry
			// READ_ALL filters out expired (false/nil) values
			expect(results).toEqual([]);
		});
	});

	describe('CLEANUP_SCRIPT', () => {
		it('should remove stale entries from membership set', async () => {
			const reg = createRegistration({ instanceKey: 'main-1' });

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(reg),
				'1', // 1 second TTL
			);

			// Wait for expiry
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const removed = await client.eval(CLEANUP_SCRIPT, 1, membershipSetKey());

			expect(removed).toBe(1);

			const members = await client.smembers(membershipSetKey());
			expect(members).toHaveLength(0);
		});

		it('should not remove active entries', async () => {
			const reg = createRegistration({ instanceKey: 'main-1' });

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(reg),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			const removed = await client.eval(CLEANUP_SCRIPT, 1, membershipSetKey());

			expect(removed).toBe(0);

			const members = await client.smembers(membershipSetKey());
			expect(members).toHaveLength(1);
		});

		it('should return 0 when no members exist', async () => {
			const removed = await client.eval(CLEANUP_SCRIPT, 1, membershipSetKey());

			expect(removed).toBe(0);
		});
	});

	describe('UNREGISTER_SCRIPT', () => {
		it('should atomically DEL key and SREM from membership set', async () => {
			const reg = createRegistration();

			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey(reg.instanceKey),
				membershipSetKey(),
				jsonStringify(reg),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			await client.eval(
				UNREGISTER_SCRIPT,
				2,
				instanceKey(reg.instanceKey),
				membershipSetKey(),
			);

			const stored = await client.get(instanceKey(reg.instanceKey));
			expect(stored).toBeNull();

			const members = await client.smembers(membershipSetKey());
			expect(members).toHaveLength(0);
		});
	});

	describe('full round-trip', () => {
		it('should support register → get → heartbeat → getAll → unregister cycle', async () => {
			const reg1 = createRegistration({ instanceKey: 'main-1', instanceRole: 'leader' });
			const reg2 = createRegistration({
				instanceKey: 'worker-1',
				instanceType: 'worker',
				instanceRole: 'unset',
			});

			// Register two instances
			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(reg1),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);
			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('worker-1'),
				membershipSetKey(),
				jsonStringify(reg2),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			// Verify individual GET
			const main = await client.get(instanceKey('main-1'));
			expect(JSON.parse(main!).instanceRole).toBe('leader');

			// Heartbeat (update main-1 role)
			const updatedReg1 = { ...reg1, lastSeen: Date.now() };
			await client.eval(
				REGISTER_SCRIPT,
				2,
				instanceKey('main-1'),
				membershipSetKey(),
				jsonStringify(updatedReg1),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);

			// Get all
			const all = (await client.eval(READ_ALL_SCRIPT, 1, membershipSetKey())) as string[];
			expect(all).toHaveLength(2);

			// Unregister worker
			await client.eval(
				UNREGISTER_SCRIPT,
				2,
				instanceKey('worker-1'),
				membershipSetKey(),
			);

			// Verify only main-1 remains
			const remaining = (await client.eval(
				READ_ALL_SCRIPT,
				1,
				membershipSetKey(),
			)) as string[];
			expect(remaining).toHaveLength(1);
			expect(JSON.parse(remaining[0]).instanceKey).toBe('main-1');
		});
	});
});
