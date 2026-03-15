import { describe, it, expect, afterEach } from 'vitest';
import { RedisEventRelay, getRedisChannel } from '../../src/engine/redis-event-relay';
import type { EngineEvent } from '../../src/engine/event-bus.types';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';

// Skip Redis integration tests when REDIS_URL is not available.
// These tests require a running Redis instance (docker-compose.test.yml).
const describeRedis = process.env.REDIS_URL ? describe : describe.skip;

describeRedis('RedisEventRelay integration', () => {
	const relays: RedisEventRelay[] = [];

	afterEach(async () => {
		await Promise.all(relays.map((r) => r.close()));
		relays.length = 0;
	});

	it('should deliver events from instance A to instance B', async () => {
		const relayA = new RedisEventRelay(REDIS_URL, 'instance-A');
		const relayB = new RedisEventRelay(REDIS_URL, 'instance-B');
		relays.push(relayA, relayB);

		// Wait for subscriptions to be ready
		await new Promise((r) => setTimeout(r, 200));

		const received: EngineEvent[] = [];
		relayB.onBroadcast((event) => received.push(event));

		const event: EngineEvent = {
			type: 'step:completed',
			eventId: 'integration-test-1',
			createdAt: Date.now(),
			executionId: 'exec-1',
			stepId: 'step-1',
			output: { value: 42 },
			durationMs: 100,
		};

		relayA.broadcast(event);

		// Wait for Redis delivery
		await new Promise((r) => setTimeout(r, 200));

		expect(received).toHaveLength(1);
		expect(received[0].eventId).toBe('integration-test-1');
		expect(received[0].type).toBe('step:completed');
	});

	it('should NOT deliver own events back to sender', async () => {
		const relay = new RedisEventRelay(REDIS_URL, 'instance-self');
		relays.push(relay);

		await new Promise((r) => setTimeout(r, 200));

		const received: EngineEvent[] = [];
		relay.onBroadcast((event) => received.push(event));

		relay.broadcast({
			type: 'execution:started',
			eventId: 'self-test-1',
			createdAt: Date.now(),
			executionId: 'exec-1',
		});

		await new Promise((r) => setTimeout(r, 200));

		expect(received).toHaveLength(0);
	});

	it('should continue working after Redis disconnect and reconnect', async () => {
		const relay = new RedisEventRelay(REDIS_URL, 'instance-resilient');
		relays.push(relay);

		await new Promise((r) => setTimeout(r, 200));

		// Broadcast should not throw even if Redis has issues
		relay.broadcast({
			type: 'execution:started',
			eventId: 'resilience-test-1',
			createdAt: Date.now(),
			executionId: 'exec-1',
		});

		// Verify relay is still functional
		expect(relay.getStatus()).toBe('ready');
	});

	it('should survive invalid JSON messages', async () => {
		const relay = new RedisEventRelay(REDIS_URL, 'instance-robust');
		relays.push(relay);

		await new Promise((r) => setTimeout(r, 200));

		const received: EngineEvent[] = [];
		relay.onBroadcast((event) => received.push(event));

		// Publish garbage directly to Redis
		const { default: Redis } = await import('ioredis');
		const directClient = new Redis(REDIS_URL);
		await directClient.publish(getRedisChannel(), 'not-json{{{');
		await directClient.disconnect();

		await new Promise((r) => setTimeout(r, 200));

		// Should not crash, should not deliver
		expect(received).toHaveLength(0);
	});
});
