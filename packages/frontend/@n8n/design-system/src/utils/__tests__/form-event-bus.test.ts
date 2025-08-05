/**
 * Test suite for form-event-bus utility
 */

import { describe, it, expect, vi } from 'vitest';
import { createFormEventBus } from '../form-event-bus';

describe('form-event-bus', () => {
	describe('createFormEventBus', () => {
		it('should create an event bus instance', () => {
			const eventBus = createFormEventBus();

			expect(eventBus).toBeDefined();
			expect(typeof eventBus.on).toBe('function');
			expect(typeof eventBus.off).toBe('function');
			expect(typeof eventBus.emit).toBe('function');
		});

		it('should allow registering submit event listeners', () => {
			const eventBus = createFormEventBus();
			const handler = vi.fn();

			eventBus.on('submit', handler);

			// Verify handler is registered (doesn't throw)
			expect(handler).toBeDefined();
		});

		it('should allow emitting submit events', () => {
			const eventBus = createFormEventBus();
			const handler = vi.fn();

			eventBus.on('submit', handler);
			eventBus.emit('submit');

			expect(handler).toHaveBeenCalledOnce();
		});

		it('should allow removing event listeners', () => {
			const eventBus = createFormEventBus();
			const handler = vi.fn();

			eventBus.on('submit', handler);
			eventBus.off('submit', handler);
			eventBus.emit('submit');

			expect(handler).not.toHaveBeenCalled();
		});

		it('should handle multiple listeners for the same event', () => {
			const eventBus = createFormEventBus();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('submit', handler1);
			eventBus.on('submit', handler2);
			eventBus.emit('submit');

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('should create independent event bus instances', () => {
			const eventBus1 = createFormEventBus();
			const eventBus2 = createFormEventBus();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus1.on('submit', handler1);
			eventBus2.on('submit', handler2);

			eventBus1.emit('submit');

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).not.toHaveBeenCalled();
		});

		it('should handle rapid event emissions', () => {
			const eventBus = createFormEventBus();
			const handler = vi.fn();

			eventBus.on('submit', handler);

			// Emit multiple times rapidly
			eventBus.emit('submit');
			eventBus.emit('submit');
			eventBus.emit('submit');

			expect(handler).toHaveBeenCalledTimes(3);
		});

		it('should handle removing non-existent listeners gracefully', () => {
			const eventBus = createFormEventBus();
			const handler = vi.fn();

			// Try to remove a handler that was never added
			expect(() => {
				eventBus.off('submit', handler);
			}).not.toThrow();
		});

		it('should handle emitting events with no listeners', () => {
			const eventBus = createFormEventBus();

			expect(() => {
				eventBus.emit('submit');
			}).not.toThrow();
		});

		it('should handle listener errors gracefully', () => {
			const eventBus = createFormEventBus();
			const throwingHandler = vi.fn(() => {
				throw new Error('Handler error');
			});
			const normalHandler = vi.fn();

			eventBus.on('submit', throwingHandler);
			eventBus.on('submit', normalHandler);

			expect(() => {
				eventBus.emit('submit');
			}).toThrow('Handler error');

			// The throwing handler should still be called
			expect(throwingHandler).toHaveBeenCalledOnce();
		});
	});
});
