import { Container, Service } from '@n8n/di';
import { expectTypeOf } from 'vitest';

import { EventService, type EventMap } from '../../index';

declare module '../../index' {
	interface EventMap {
		'test-event': { id: string };
	}
}

@Service()
class EventConsumer {
	constructor(readonly events: EventService) {}
}

describe('EventService', () => {
	afterEach(() => {
		Container.reset();
	});

	it('shares the event bus with injected consumers', () => {
		const events = Container.get(EventService);
		const consumer = Container.get(EventConsumer);
		const listener = vi.fn();
		consumer.events.on('test-event', listener);

		events.emit('test-event', { id: 'first' });
		consumer.events.off('test-event', listener);
		events.emit('test-event', { id: 'second' });

		expect(consumer.events).toBe(events);
		expect(listener).toHaveBeenCalledExactlyOnceWith({ id: 'first' });
	});

	it('uses augmented event names and payload types', () => {
		const events = new EventService();
		expectTypeOf<EventMap['test-event']>().toEqualTypeOf<{ id: string }>();
		expectTypeOf(events.emit<'test-event'>).parameters.toEqualTypeOf<
			[eventName: 'test-event', payload?: { id: string }]
		>();
		expectTypeOf(events.on<'test-event'>)
			.parameter(1)
			.toEqualTypeOf<(payload: { id: string }) => void>();
		expectTypeOf(events.once<'test-event'>)
			.parameter(1)
			.toEqualTypeOf<(payload: { id: string }) => void>();
		expectTypeOf(events.off<'test-event'>)
			.parameter(1)
			.toEqualTypeOf<(payload: { id: string }) => void>();
		// @ts-expect-error Only registered event names are valid.
		expectTypeOf(events.emit<'unregistered-event'>);
	});
});
