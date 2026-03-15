import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis
const mockPublish = vi.fn().mockResolvedValue(1);
const mockSubscribe = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const messageHandlers: ((channel: string, message: string) => void)[] = [];

vi.mock('ioredis', () => {
	const MockRedis = vi.fn().mockImplementation(() => ({
		publish: mockPublish,
		subscribe: mockSubscribe,
		disconnect: mockDisconnect,
		status: 'ready',
		on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
			if (event === 'message') {
				messageHandlers.push(handler as (ch: string, msg: string) => void);
			}
		}),
	}));
	return { default: MockRedis };
});

import { RedisEventRelay, getRedisChannel } from '../redis-event-relay';
import type { EngineEvent } from '../event-bus.types';

describe('RedisEventRelay', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		messageHandlers.length = 0;
	});

	it('should publish events with instanceId envelope', () => {
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');

		const event = {
			type: 'step:completed' as const,
			eventId: 'evt-1',
			createdAt: Date.now(),
			executionId: 'exec-1',
			stepId: 'step-1',
			output: { ok: true },
			durationMs: 42,
		};

		relay.broadcast(event);

		expect(mockPublish).toHaveBeenCalledWith(
			getRedisChannel(),
			JSON.stringify({ instanceId: 'instance-A', event }),
		);
	});

	it('should deliver events from OTHER instances to broadcast handlers', () => {
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
		const handler = vi.fn();
		relay.onBroadcast(handler);

		const event: EngineEvent = {
			type: 'step:started',
			eventId: 'evt-2',
			createdAt: Date.now(),
			executionId: 'exec-1',
			stepId: 'step-1',
			attempt: 1,
		};

		// Simulate message from a DIFFERENT instance
		for (const h of messageHandlers) {
			h(getRedisChannel(), JSON.stringify({ instanceId: 'instance-B', event }));
		}

		expect(handler).toHaveBeenCalledWith(event);
	});

	it('should SKIP events from the SAME instance (dedup)', () => {
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
		const handler = vi.fn();
		relay.onBroadcast(handler);

		const event: EngineEvent = {
			type: 'step:started',
			eventId: 'evt-3',
			createdAt: Date.now(),
			executionId: 'exec-1',
			stepId: 'step-1',
			attempt: 1,
		};

		// Simulate message from the SAME instance
		for (const h of messageHandlers) {
			h(getRedisChannel(), JSON.stringify({ instanceId: 'instance-A', event }));
		}

		expect(handler).not.toHaveBeenCalled();
	});

	it('should swallow publish errors without throwing', () => {
		mockPublish.mockRejectedValueOnce(new Error('Redis connection lost'));
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');

		expect(() => {
			relay.broadcast({
				type: 'execution:started',
				eventId: 'err-test',
				createdAt: Date.now(),
				executionId: 'exec-1',
			});
		}).not.toThrow();
	});

	it('should close both Redis connections', async () => {
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
		await relay.close();

		expect(mockDisconnect).toHaveBeenCalledTimes(2); // publisher + subscriber
	});

	it('should expose connection status', () => {
		const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
		expect(relay.getStatus()).toBe('ready');
	});
});
