import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { DurableEventLog } from '../durable-event-log';
import { InProcessEventBus } from '../in-process-event-bus';

function makeEvent(type: string, runId: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: 'agent-001',
		payload: { text: `${type}-${runId}` },
	};
}

describe('InProcessEventBus', () => {
	let bus: InProcessEventBus;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let instanceSettings: { isMultiMain: boolean };

	function buildBus() {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);
		// Flag off: the durable log is never touched, so a bare mock suffices.
		const eventLog = mock<DurableEventLog>();
		const globalConfig = { instanceAi: { durableLog: false } } as GlobalConfig;
		return new InProcessEventBus(
			logger,
			instanceSettings as InstanceSettings,
			publisher,
			eventLog,
			globalConfig,
		);
	}

	beforeEach(() => {
		instanceSettings = { isMultiMain: false };
		bus = buildBus();
	});

	afterEach(() => {
		bus.clear();
	});

	describe('publish', () => {
		it('should assign monotonically increasing IDs per thread', () => {
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
	});

	describe('subscribe', () => {
		it('should receive events published after subscription', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			expect(received).toHaveLength(2);
			expect(received[0].id).toBe(1);
			expect(received[1].id).toBe(2);
		});

		it('should not receive events from other threads', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-2', makeEvent('a', 'run_2'));

			expect(received).toHaveLength(0);
		});

		it('should stop delivery after unsubscribe', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
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
		it('should return 1 for a new thread', () => {
			expect(bus.getNextEventId('thread-1')).toBe(1);
		});

		it('should return the next sequential ID after publishing', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			expect(bus.getNextEventId('thread-1')).toBe(3);
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
	});

	describe('clear', () => {
		it('should remove all stored events and listeners', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(received).toHaveLength(1);

			bus.clear();

			// Events cleared
			expect(bus.getEventsAfter('thread-1', 0)).toEqual([]);
			expect(bus.getNextEventId('thread-1')).toBe(1);

			// Listener removed — new publish should not reach old handler
			bus.publish('thread-1', makeEvent('b', 'run_1'));
			expect(received).toHaveLength(1);
		});
	});

	describe('cross-main relay', () => {
		it('does not relay when single-main', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('relays each event via pubsub when multi-main', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();

			const event = makeEvent('a', 'run_1');
			bus.publish('thread-1', event);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-event',
				payload: { threadId: 'thread-1', event },
			});
		});

		it('still delivers locally even when relaying', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id!));

			bus.publish('thread-1', makeEvent('a', 'run_1'));

			expect(received).toEqual([1]);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		});

		it('skips relay for oversized events but still delivers locally', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id!));
			const huge = makeEvent('a', 'run_1');
			(huge.payload as { text: string }).text = 'x'.repeat(6 * 1024 * 1024);

			bus.publish('thread-1', huge);

			// Relay skipped (would bloat pubsub), but the local SSE client still got it
			// synchronously via the emit (even though the 2 MB store cap then evicts it).
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(received).toEqual([1]);
		});

		it('publishLocalOnly never relays', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();

			bus.publishLocalOnly('thread-1', makeEvent('a', 'run_1'));

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(bus.getEventsAfter('thread-1', 0)).toHaveLength(1);
		});
	});

	describe('handleRelayInstanceAiEvent', () => {
		it('re-emits a relayed event when this main holds an SSE subscriber', () => {
			const received: number[] = [];
			bus.subscribe('thread-1', (e) => received.push(e.id!));

			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', event: makeEvent('a', 'run_1') });

			expect(received).toEqual([1]);
			// Re-emit must not re-relay (loop guard): publishLocalOnly path.
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('ignores a relayed event when this main has no subscriber for the thread', () => {
			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', event: makeEvent('a', 'run_1') });

			// Nothing stored, since the thread has no local consumer here.
			expect(bus.getEventsAfter('thread-1', 0)).toHaveLength(0);
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
