import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { StoredEvent } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { DrainedEvent, DurableEventLog } from '../durable-event-log';
import { InProcessEventBus } from '../in-process-event-bus';

function makeEvent(type: string, runId: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: 'agent-001',
		payload: { text: `${type}-${runId}` },
	};
}

/**
 * Stand-in for the real DurableEventLog: assigns a per-thread monotonic seq and
 * hands each published event straight back to the bus as a durable + live
 * drained event. That drives both the live-delivery cache (getEventsForRun) and
 * the SSE emit + cross-main relay the bus performs in `onDrained`.
 */
function makeFakeEventLog() {
	const nextSeq = new Map<string, number>();
	const drain = new Map<string, (drained: DrainedEvent) => void>();
	return {
		publish(threadId: string, event: InstanceAiEvent, emit: (drained: DrainedEvent) => void) {
			drain.set(threadId, emit);
			const seq = (nextSeq.get(threadId) ?? 0) + 1;
			nextSeq.set(threadId, seq);
			emit({ id: seq, event, live: true });
		},
		clearThread(threadId: string) {
			nextSeq.delete(threadId);
			drain.delete(threadId);
		},
		clear() {
			nextSeq.clear();
			drain.clear();
		},
	} as unknown as DurableEventLog;
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
		const eventLog = makeFakeEventLog();
		return new InProcessEventBus(logger, instanceSettings as InstanceSettings, publisher, eventLog);
	}

	beforeEach(() => {
		instanceSettings = { isMultiMain: false };
		bus = buildBus();
	});

	afterEach(() => {
		bus.clear();
	});

	describe('subscribe', () => {
		it('should receive events published after subscription', () => {
			const received: StoredEvent[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			bus.publish('thread-1', makeEvent('b', 'run_1'));

			expect(received).toHaveLength(2);
			expect(received[0].id).toBe(1);
			expect(received[1].id).toBe(2);
		});

		it('should not receive events from other threads', () => {
			const received: StoredEvent[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-2', makeEvent('a', 'run_2'));

			expect(received).toHaveLength(0);
		});

		it('should stop delivery after unsubscribe', () => {
			const received: StoredEvent[] = [];
			const unsubscribe = bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(received).toHaveLength(1);

			unsubscribe();

			bus.publish('thread-1', makeEvent('b', 'run_1'));
			expect(received).toHaveLength(1);
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
		it('should remove all cached events and listeners', () => {
			const received: StoredEvent[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.publish('thread-1', makeEvent('a', 'run_1'));
			expect(received).toHaveLength(1);

			bus.clear();

			// Cache cleared
			expect(bus.getEventsForRun('thread-1', 'run_1')).toEqual([]);

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
			// synchronously via the emit.
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(received).toEqual([1]);
		});
	});

	describe('handleRelayInstanceAiEvent', () => {
		it('re-emits a relayed event without an id when this main holds an SSE subscriber', () => {
			const received: StoredEvent[] = [];
			bus.subscribe('thread-1', (e) => received.push(e));

			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', event: makeEvent('a', 'run_1') });

			// The durable seq lives in the shared DB; the sibling replays from the
			// log on reconnect, so the relayed frame carries no id and re-emit must
			// not re-relay (loop guard).
			expect(received).toHaveLength(1);
			expect(received[0].id).toBeUndefined();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('ignores a relayed event when this main has no subscriber for the thread', () => {
			const received: StoredEvent[] = [];
			// No subscription on thread-1 here.

			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', event: makeEvent('a', 'run_1') });

			expect(received).toHaveLength(0);
			// Nothing cached, since the thread has no local consumer here.
			expect(bus.getEventsForRun('thread-1', 'run_1')).toHaveLength(0);
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
