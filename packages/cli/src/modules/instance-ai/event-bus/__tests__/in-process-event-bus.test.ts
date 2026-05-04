import type { InstanceAiEvent } from '@n8n/api-types';

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

	beforeEach(() => {
		bus = new InProcessEventBus();
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
			const received: Array<{ id: number; event: InstanceAiEvent }> = [];
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
});
