import { describe, it, expect, vi } from 'vitest';

import { createEventBus } from '@/utils/event-bus';

describe('event-bus', () => {
	describe('createEventBus', () => {
		it('should create an event bus with on, off, and emit methods', () => {
			const eventBus = createEventBus();

			expect(eventBus).toHaveProperty('on');
			expect(eventBus).toHaveProperty('off');
			expect(eventBus).toHaveProperty('emit');
			expect(typeof eventBus.on).toBe('function');
			expect(typeof eventBus.off).toBe('function');
			expect(typeof eventBus.emit).toBe('function');
		});

		it('should register and call event handlers', async () => {
			const eventBus = createEventBus();
			const handler = vi.fn();

			eventBus.on('test-event', handler);
			eventBus.emit('test-event', { data: 'test' });

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(handler).toHaveBeenCalledWith({ data: 'test' });
		});

		it('should support multiple handlers for the same event', async () => {
			const eventBus = createEventBus();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('multi-event', handler1);
			eventBus.on('multi-event', handler2);
			eventBus.emit('multi-event', 'test-data');

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(handler1).toHaveBeenCalledWith('test-data');
			expect(handler2).toHaveBeenCalledWith('test-data');
		});

		it('should remove event handlers using off method', async () => {
			const eventBus = createEventBus();
			const handler = vi.fn();

			eventBus.on('removable-event', handler);
			eventBus.off('removable-event', handler);
			eventBus.emit('removable-event', 'should-not-be-called');

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(handler).not.toHaveBeenCalled();
		});

		it('should return unregister function from on method', async () => {
			const eventBus = createEventBus();
			const handler = vi.fn();

			const unregister = eventBus.on('auto-remove-event', handler);
			unregister();
			eventBus.emit('auto-remove-event', 'should-not-be-called');

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(handler).not.toHaveBeenCalled();
		});

		it('should handle events without data', async () => {
			const eventBus = createEventBus();
			const handler = vi.fn();

			eventBus.on('no-data-event', handler);
			eventBus.emit('no-data-event');

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(handler).toHaveBeenCalledWith(undefined);
		});

		it('should handle non-existent event emission gracefully', () => {
			const eventBus = createEventBus();

			// Should not throw error when emitting non-existent event
			expect(() => {
				eventBus.emit('non-existent-event', 'data');
			}).not.toThrow();
		});

		it('should handle removing non-existent handler gracefully', () => {
			const eventBus = createEventBus();
			const handler = vi.fn();

			// Should not throw error when removing non-existent handler
			expect(() => {
				eventBus.off('non-existent-event', handler);
			}).not.toThrow();
		});

		it('should handle removing handler that was never added', () => {
			const eventBus = createEventBus();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('test-event', handler1);

			// Should not throw error when removing handler that was never added
			expect(() => {
				eventBus.off('test-event', handler2);
			}).not.toThrow();
		});

		it('should support different event types with typed emit', async () => {
			const eventBus = createEventBus();
			const stringHandler = vi.fn();
			const objectHandler = vi.fn();

			eventBus.on('string-event', stringHandler);
			eventBus.on('object-event', objectHandler);

			eventBus.emit<string>('string-event', 'hello world');
			eventBus.emit<{ id: number; name: string }>('object-event', { id: 1, name: 'test' });

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(stringHandler).toHaveBeenCalledWith('hello world');
			expect(objectHandler).toHaveBeenCalledWith({ id: 1, name: 'test' });
		});

		it('should execute handlers asynchronously', async () => {
			const eventBus = createEventBus();
			const executionOrder: string[] = [];

			const handler = vi.fn(() => {
				executionOrder.push('handler');
			});

			eventBus.on('async-event', handler);
			eventBus.emit('async-event', 'test');
			executionOrder.push('after-emit');

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(handler).toHaveBeenCalledWith('test');
			expect(executionOrder).toContain('after-emit');
			expect(executionOrder).toContain('handler');
		});
	});
});
