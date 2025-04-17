import { createEventBus } from './event-bus';

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
	});

	describe('once()', () => {
		it('should register event handler', () => {
			const handler = vi.fn();
			const eventName = 'test';

			eventBus.once(eventName, handler);

			eventBus.emit(eventName, {});

			expect(handler).toHaveBeenCalled();
		});

		it('should unregister event handler after first call', () => {
			const handler = vi.fn();
			const eventName = 'test';

			eventBus.once(eventName, handler);

			eventBus.emit(eventName, {});
			eventBus.emit(eventName, {});

			expect(handler).toHaveBeenCalledTimes(1);
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
