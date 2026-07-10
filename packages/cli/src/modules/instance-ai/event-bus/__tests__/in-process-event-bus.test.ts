import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { InProcessEventBus } from '../in-process-event-bus';

function makeEvent(type: string, runId: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: 'agent-001',
		payload: { text: `${type}-${runId}` },
	};
}

/** Flush the per-thread drain: each batch awaits one (mock) Redis round trip. */
async function flushDrain() {
	await new Promise((resolve) => setImmediate(resolve));
}

describe('InProcessEventBus', () => {
	let bus: InProcessEventBus;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let instanceSettings: { isMultiMain: boolean };

	/** Shared fake Redis sequence — one Map plays the role of the Redis server,
	 *  so two bus instances built in one test behave like two mains. */
	let seqByKey: Map<string, number>;
	let redisFailure: Error | null;
	let incrbyCalls: Array<{ key: string; count: number }>;
	let deletedKeys: string[];

	const redisClient = {
		multi: (): unknown => {
			let incrArgs: { key: string; count: number } | null = null;
			const chain = {
				incrby(key: string, count: number) {
					incrArgs = { key, count };
					return chain;
				},
				expire() {
					return chain;
				},
				async exec() {
					if (redisFailure) throw redisFailure;
					const { key, count } = incrArgs!;
					incrbyCalls.push({ key, count });
					const value = (seqByKey.get(key) ?? 0) + count;
					seqByKey.set(key, value);
					return [
						[null, value],
						[null, 1],
					];
				},
			};
			return chain;
		},
		async get(key: string) {
			if (redisFailure) throw redisFailure;
			const value = seqByKey.get(key);
			return value === undefined ? null : String(value);
		},
		async del(key: string) {
			deletedKeys.push(key);
			seqByKey.delete(key);
			return 1;
		},
	};

	function buildBus() {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);
		publisher.getClient.mockReturnValue(redisClient as never);
		const globalConfig = mock<GlobalConfig>({ redis: { prefix: 'n8n' } });
		return new InProcessEventBus(
			logger,
			instanceSettings as InstanceSettings,
			publisher,
			globalConfig,
		);
	}

	beforeEach(() => {
		instanceSettings = { isMultiMain: false };
		seqByKey = new Map();
		redisFailure = null;
		incrbyCalls = [];
		deletedKeys = [];
		bus = buildBus();
	});

	afterEach(() => {
		bus.clear();
	});

	describe('publish (single-main)', () => {
		it('should assign monotonically increasing IDs per thread in the same tick', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			bus.publish('thread-1', makeEvent('c', 'run_1'));

			const events = bus.getEventsAfter('thread-1', 0);
			expect(events).toHaveLength(3);
			expect(events[0].id).toBe(1);
			expect(events[1].id).toBe(2);
			expect(events[2].id).toBe(3);
		});

		it('should use independent ID sequences per thread', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			bus.publish('thread-2', makeEvent('c', 'run_2'));

			const events1 = bus.getEventsAfter('thread-1', 0);
			const events2 = bus.getEventsAfter('thread-2', 0);

			expect(events1).toHaveLength(2);
			expect(events1[0].id).toBe(1);
			expect(events1[1].id).toBe(2);

			expect(events2).toHaveLength(1);
			expect(events2[0].id).toBe(1);
		});

		it('should not touch Redis', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(seqByKey.size).toBe(0);
		});
	});

	describe('publish (multi-main, shared sequence)', () => {
		beforeEach(() => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
		});

		it('assigns ids from the shared Redis sequence in publish order', async () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			bus.publish('thread-1', makeEvent('c', 'run_1'));
			await flushDrain();

			const events = bus.getEventsAfter('thread-1', 0);
			expect(events.map((e) => e.id)).toEqual([1, 2, 3]);
			expect(events.map((e) => e.event.payload)).toEqual([
				{ text: 'a-run_1' },
				{ text: 'b-run_1' },
				{ text: 'c-run_1' },
			]);
		});

		it('sequences events queued during a Redis round trip as one INCRBY batch', async () => {
			bus.publish('thread-1', makeEvent('a', 'run_1')); // drains alone
			bus.publish('thread-1', makeEvent('b', 'run_1')); // queued during the round trip
			bus.publish('thread-1', makeEvent('c', 'run_1')); // queued during the round trip
			await flushDrain();

			expect(incrbyCalls.map((c) => c.count)).toEqual([1, 2]);
			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([1, 2, 3]);
		});

		it('continues the sequence started by another main', async () => {
			const otherMain = buildBus();
			otherMain.publish('thread-1', makeEvent('a', 'run_1'));
			otherMain.publish('thread-1', makeEvent('b', 'run_1'));
			await flushDrain();

			bus.publish('thread-1', makeEvent('c', 'run_1'));
			await flushDrain();

			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([3]);
		});

		it('falls back to local ids above the high-water mark when Redis fails', async () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			await flushDrain();

			redisFailure = new Error('connection lost');
			bus.publish('thread-1', makeEvent('c', 'run_1'));
			await flushDrain();

			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([1, 2, 3]);
		});

		it('keeps fallback ids above ids observed from relayed events', async () => {
			redisFailure = new Error('connection lost');
			// A sibling produced up to id 7 — observed via relay without a subscriber.
			bus.handleRelayInstanceAiEvent({
				threadId: 'thread-1',
				storedEvent: { id: 7, event: makeEvent('x', 'run_1') },
			});

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			await flushDrain();

			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([8]);
		});
	});

	describe('subscribe', () => {
		it('should receive events published after subscription', () => {
			const received: Array<{ id: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			expect(received).toHaveLength(2);
			expect(received[0].id).toBe(1);
			expect(received[1].id).toBe(2);
		});

		it('should not receive events from other threads', () => {
			const received: Array<{ id: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-2', makeEvent('a', 'run_2'));

			expect(received).toHaveLength(0);
		});

		it('should stop delivery after unsubscribe', () => {
			const received: Array<{ id: number; event: InstanceAiEvent }> = [];
			const unsubscribe = bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(received).toHaveLength(1);

			unsubscribe();

			bus.publish('thread-1', makeEvent('b', 'run_1'));
			expect(received).toHaveLength(1);
		});
	});

	describe('getEventsAfter', () => {
		it('should return all events when afterId is 0', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			bus.publish('thread-1', makeEvent('c', 'run_1'));

			const events = bus.getEventsAfter('thread-1', 0);
			expect(events).toHaveLength(3);
		});

		it('should skip events with id <= afterId', () => {
			for (let i = 0; i < 7; i++) {
				bus.publish('thread-1', makeEvent(`e${i}`, 'run_1'));
			}

			const events = bus.getEventsAfter('thread-1', 5);
			expect(events).toHaveLength(2);
			expect(events[0].id).toBe(6);
			expect(events[1].id).toBe(7);
		});

		it('should return empty array for unknown thread', () => {
			const events = bus.getEventsAfter('nonexistent', 0);
			expect(events).toEqual([]);
		});

		it('should return empty array when all events are before cursor', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			const events = bus.getEventsAfter('thread-1', 10);
			expect(events).toEqual([]);
		});
	});

	describe('getNextEventId', () => {
		it('should return 1 for a new thread', async () => {
			await expect(bus.getNextEventId('thread-1')).resolves.toBe(1);
		});

		it('should return the next sequential ID after publishing', async () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			await expect(bus.getNextEventId('thread-1')).resolves.toBe(3);
		});

		it('reads the shared sequence in multi-main, so any main returns the same cursor', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
			const otherMain = buildBus();

			otherMain.publish('thread-1', makeEvent('a', 'run_1'));
			otherMain.publish('thread-1', makeEvent('b', 'run_1'));
			await flushDrain();

			// This main never buffered the thread, but agrees on the next id.
			await expect(bus.getNextEventId('thread-1')).resolves.toBe(3);
		});

		it('falls back to the local high-water mark when Redis fails', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			await flushDrain();

			redisFailure = new Error('connection lost');
			await expect(bus.getNextEventId('thread-1')).resolves.toBe(2);
		});
	});

	describe('getEventsForRun', () => {
		it('should return only events matching the given runId', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_2'));
			bus.publish('thread-1', makeEvent('c', 'run_1'));
			bus.publish('thread-1', makeEvent('d', 'run_2'));

			const run1Events = bus.getEventsForRun('thread-1', 'run_1');
			expect(run1Events).toHaveLength(2);
			expect(run1Events.every((e) => e.runId === 'run_1')).toBe(true);

			const run2Events = bus.getEventsForRun('thread-1', 'run_2');
			expect(run2Events).toHaveLength(2);
			expect(run2Events.every((e) => e.runId === 'run_2')).toBe(true);
		});

		it('should return empty array for unknown thread', () => {
			expect(bus.getEventsForRun('nonexistent', 'run_1')).toEqual([]);
		});

		it('should return empty array when no events match the runId', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(bus.getEventsForRun('thread-1', 'run_99')).toEqual([]);
		});

		it('should return unwrapped InstanceAiEvent objects (not StoredEvent)', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));

			const events = bus.getEventsForRun('thread-1', 'run_1');
			expect(events[0]).not.toHaveProperty('id'); // No StoredEvent wrapper
			expect(events[0]).toHaveProperty('type');
			expect(events[0]).toHaveProperty('runId');
			expect(events[0]).toHaveProperty('agentId');
		});

		it('includes events still awaiting a sequence number (same-main read-your-writes)', () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();

			bus.publish('thread-1', makeEvent('a', 'run_1'));

			// No drain flush: the event has no id yet, but same-main callers
			// (terminal outcomes, tracing, snapshots) must still see it.
			expect(bus.getEventsForRun('thread-1', 'run_1')).toHaveLength(1);
			expect(bus.getEventsAfter('thread-1', 0)).toHaveLength(0);
		});
	});

	describe('clear', () => {
		it('should remove all stored events and listeners', async () => {
			const received: Array<{ id: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(received).toHaveLength(1);

			bus.clear();

			// Events cleared
			expect(bus.getEventsAfter('thread-1', 0)).toEqual([]);
			await expect(bus.getNextEventId('thread-1')).resolves.toBe(1);

			// Listener removed — new publish should not reach old handler
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			expect(received).toHaveLength(1);
		});
	});

	describe('clearThread', () => {
		it('deletes the shared sequence key in multi-main', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			await flushDrain();
			expect(seqByKey.size).toBe(1);

			bus.clearThread('thread-1');
			await flushDrain();

			expect(deletedKeys).toEqual(['n8n:instance-ai:event-seq:thread-1']);
			expect(bus.getEventsAfter('thread-1', 0)).toEqual([]);
		});

		it('does not touch Redis in single-main', async () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.clearThread('thread-1');
			await flushDrain();

			expect(deletedKeys).toEqual([]);
		});
	});

	describe('cross-main relay', () => {
		it('does not relay when single-main', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('relays each event with its producer-assigned id when multi-main', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();

			const event = makeEvent('a', 'run_1');
			bus.publish('thread-1', event);
			await flushDrain();

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-event',
				payload: { threadId: 'thread-1', storedEvent: { id: 1, event } },
			});
		});

		it('still delivers locally even when relaying', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			await flushDrain();

			expect(received).toEqual([1]);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		});

		it('skips relay for oversized events but still delivers locally', async () => {
			instanceSettings = { isMultiMain: true };
			bus = buildBus();
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id));
			const huge = makeEvent('a', 'run_1');
			(huge.payload as { text: string }).text = 'x'.repeat(6 * 1024 * 1024);

			bus.publish('thread-1', huge);
			await flushDrain();

			// Relay skipped (would bloat pubsub), but the local SSE client still got it
			// via the emit (even though the 2 MB store cap then evicts it).
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(received).toEqual([1]);
		});
	});

	describe('handleRelayInstanceAiEvent', () => {
		it('stores and re-emits a relayed event under its producer-assigned id', () => {
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id));

			bus.handleRelayInstanceAiEvent({
				threadId: 'thread-1',
				storedEvent: { id: 42, event: makeEvent('a', 'run_1') },
			});

			expect(received).toEqual([42]);
			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([42]);
			// Re-emit must not re-relay (loop guard).
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('ignores a relayed event when this main has no subscriber for the thread', () => {
			bus.handleRelayInstanceAiEvent({
				threadId: 'thread-1',
				storedEvent: { id: 1, event: makeEvent('a', 'run_1') },
			});

			// Nothing stored, since the thread has no local consumer here.
			expect(bus.getEventsAfter('thread-1', 0)).toHaveLength(0);
		});

		it('keeps the store sorted when a concurrent producer relays a lower id', () => {
			bus.subscribe('thread-1', () => {});

			bus.handleRelayInstanceAiEvent({
				threadId: 'thread-1',
				storedEvent: { id: 5, event: makeEvent('later', 'run_1') },
			});
			bus.handleRelayInstanceAiEvent({
				threadId: 'thread-1',
				storedEvent: { id: 3, event: makeEvent('earlier', 'run_2') },
			});

			expect(bus.getEventsAfter('thread-1', 0).map((e) => e.id)).toEqual([3, 5]);
		});

		it('drops a duplicate id instead of storing or emitting it twice', () => {
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id));
			const storedEvent = { id: 5, event: makeEvent('a', 'run_1') };

			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', storedEvent });
			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', storedEvent });

			expect(received).toEqual([5]);
			expect(bus.getEventsAfter('thread-1', 0)).toHaveLength(1);
		});
	});

	describe('hasSubscribers', () => {
		it('reflects active subscriptions', () => {
			expect(bus.hasSubscribers('thread-1')).toBe(false);
			const unsubscribe = bus.subscribe('thread-1', () => {});
			expect(bus.hasSubscribers('thread-1')).toBe(true);
			unsubscribe();
			expect(bus.hasSubscribers('thread-1')).toBe(false);
		});
	});
});
