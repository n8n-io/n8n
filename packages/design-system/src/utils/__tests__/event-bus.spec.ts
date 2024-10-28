import { createEventBus } from '../event-bus';

describe('createEventBus()', () => {
	const eventBus = createEventBus();

	describe('on()', () => {
		it('should register event handler', () => {
			const handler = vi.fn();
			const eventName = 'test';

			eventBus.on(eventName, handler);

			eventBus.emit(eventName, {});

			expect(handler).toHaveBeenCalled();
		});

		it('should return unregister fn', () => {
			const handler = vi.fn();
			const eventName = 'test';

			const unregister = eventBus.on(eventName, handler);

			unregister();

			eventBus.emit(eventName, {});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('off()', () => {
		it('should register event handler', () => {
			const handler = vi.fn();
			const eventName = 'test';

			eventBus.on(eventName, handler);
			eventBus.off(eventName, handler);

			eventBus.emit(eventName, {});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('emit()', () => {
		it('should call handlers with given event', () => {
			const handlerA = vi.fn();
			const handlerB = vi.fn();
			const eventName = 'test';
			const event = new Event(eventName);

			eventBus.on(eventName, handlerA);
			eventBus.on(eventName, handlerB);

			eventBus.emit(eventName, event);

			expect(handlerA).toHaveBeenCalledWith(event);
			expect(handlerB).toHaveBeenCalledWith(event);
		});
	});
});
