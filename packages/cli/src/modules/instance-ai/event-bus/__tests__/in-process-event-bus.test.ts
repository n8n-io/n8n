import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { DurableEventLog } from '../durable-event-log';
import { InProcessEventBus } from '../in-process-event-bus';

type EmitFn = (drained: { id?: number; event: InstanceAiEvent; live: boolean }) => void;

function makeEvent(text: string, runId: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId,
		agentId: 'agent-001',
		payload: { text },
	};
}

describe('InProcessEventBus', () => {
	let bus: InProcessEventBus;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let eventLog: ReturnType<typeof mock<DurableEventLog>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let instanceSettings: { isMultiMain: boolean };

	function buildBus() {
		logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);
		eventLog = mock<DurableEventLog>();
		return new InProcessEventBus(logger, instanceSettings as InstanceSettings, publisher, eventLog);
	}

	/** Route a publish through the mocked drain and hand back its emit callback. */
	function publishAndCaptureEmit(threadId: string, event: InstanceAiEvent): EmitFn {
		bus.publish(threadId, event);
		const call = eventLog.publish.mock.calls.at(-1)!;
		expect(call[0]).toBe(threadId);
		// publish() stamps `ts` onto a copy before handing it to the log
		expect(call[1]).toEqual({ ...event, ts: expect.any(Number) });
		return call[2] as EmitFn;
	}

	beforeEach(() => {
		instanceSettings = { isMultiMain: false };
		bus = buildBus();
	});

	describe('publish', () => {
		it('enqueues into the durable log rather than storing anything itself', () => {
			bus.publish('thread-1', makeEvent('a', 'run_1'));

			expect(eventLog.publish).toHaveBeenCalledTimes(1);
		});

		it('stamps ts once and leaves an already-stamped event alone', () => {
			bus.publish('thread-1', { ...makeEvent('a', 'run_1'), ts: 42 });

			expect(eventLog.publish.mock.calls[0][1]).toEqual(expect.objectContaining({ ts: 42 }));
		});
	});

	describe('drained events', () => {
		it('emits a durable fact to subscribers with its DB seq', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('a', 'run_1');

			publishAndCaptureEmit('thread-1', event)({ id: 7, event, live: true });

			expect(received).toEqual([{ id: 7, event }]);
		});

		it('emits ephemeral events without an id, so the replay cursor skips them', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('a', 'run_1');

			publishAndCaptureEmit('thread-1', event)({ event, live: true });

			expect(received).toEqual([{ event }]);
			expect(received[0]).not.toHaveProperty('id');
		});

		it('drops a coalesced block entirely — subscribers already saw its deltas', () => {
			const received: unknown[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('a', 'run_1');

			publishAndCaptureEmit('thread-1', event)({ id: 3, event, live: false });

			expect(received).toHaveLength(0);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('delivers only the subscribed thread, and stops after unsubscribe', () => {
			const received: unknown[] = [];
			const unsubscribe = bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('a', 'run_1');

			publishAndCaptureEmit('thread-2', event)({ id: 1, event, live: true });
			expect(received).toHaveLength(0);

			const emit = publishAndCaptureEmit('thread-1', event);
			emit({ id: 1, event, live: true });
			expect(received).toHaveLength(1);

			unsubscribe();
			emit({ id: 2, event, live: true });
			expect(received).toHaveLength(1);
		});

		it('reports whether this main holds a subscription', () => {
			expect(bus.hasSubscribers('thread-1')).toBe(false);
			const unsubscribe = bus.subscribe('thread-1', () => {});
			expect(bus.hasSubscribers('thread-1')).toBe(true);
			unsubscribe();
			expect(bus.hasSubscribers('thread-1')).toBe(false);
		});
	});

	describe('cross-main relay', () => {
		it('does not relay when single-main', () => {
			const event = makeEvent('a', 'run_1');

			publishAndCaptureEmit('thread-1', event)({ id: 1, event, live: true });

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('relays live events, passing the DB seq through and omitting it when ephemeral', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();
			const event = makeEvent('a', 'run_1');

			const emit = publishAndCaptureEmit('thread-1', event);
			emit({ id: 9, event, live: true });
			emit({ event, live: true });

			expect(publisher.publishCommand).toHaveBeenNthCalledWith(1, {
				command: 'relay-instance-ai-event',
				payload: { threadId: 'thread-1', storedEvent: { id: 9, event } },
			});
			expect(publisher.publishCommand).toHaveBeenNthCalledWith(2, {
				command: 'relay-instance-ai-event',
				payload: { threadId: 'thread-1', storedEvent: { event } },
			});
		});

		it('skips relay for an oversized event but still delivers it locally', () => {
			instanceSettings.isMultiMain = true;
			bus = buildBus();
			const received: unknown[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('x'.repeat(6 * 1024 * 1024), 'run_1'); // > MAX_PUBSUB_PAYLOAD_BYTES

			publishAndCaptureEmit('thread-1', event)({ id: 1, event, live: true });

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(received).toHaveLength(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping cross-main relay'),
				expect.objectContaining({ threadId: 'thread-1' }),
			);
		});
	});

	describe('handleRelayInstanceAiEvent', () => {
		it('re-emits a relayed frame to subscribers, id-bearing or not', () => {
			const received: Array<{ id?: number; event: InstanceAiEvent }> = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));
			const event = makeEvent('a', 'run_1');

			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', storedEvent: { event } });
			bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', storedEvent: { id: 4, event } });

			expect(received).toEqual([{ event }, { id: 4, event }]);
		});

		it('drops a relayed frame for a thread this main has no subscriber for', () => {
			const event = makeEvent('a', 'run_1');
			// Nothing to assert beyond "does not throw and delivers nowhere": replay
			// is served from the log, so an unsubscribed main needs no copy.
			expect(() =>
				bus.handleRelayInstanceAiEvent({ threadId: 'thread-1', storedEvent: { id: 4, event } }),
			).not.toThrow();
		});
	});

	describe('teardown', () => {
		it('clearThread drops the thread subscription and the log drain state', () => {
			const received: unknown[] = [];
			bus.subscribe('thread-1', (stored) => received.push(stored));

			bus.clearThread('thread-1');

			expect(eventLog.clearThread).toHaveBeenCalledWith('thread-1');
			expect(bus.hasSubscribers('thread-1')).toBe(false);
		});

		it('clear drops every subscription and the log state', () => {
			bus.subscribe('thread-1', () => {});
			bus.subscribe('thread-2', () => {});

			bus.clear();

			expect(eventLog.clear).toHaveBeenCalledTimes(1);
			expect(bus.hasSubscribers('thread-1')).toBe(false);
			expect(bus.hasSubscribers('thread-2')).toBe(false);
		});
	});
});
