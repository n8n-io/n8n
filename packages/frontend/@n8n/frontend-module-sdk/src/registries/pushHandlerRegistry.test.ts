import type { PushMessage } from '@n8n/api-types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import * as pushHandlerRegistry from './pushHandlerRegistry';
import type { ModulePushHandlerContext, ModulePushHandlers } from '../types/push';

const context = { router: {} } as unknown as ModulePushHandlerContext;

describe('pushHandlerRegistry', () => {
	beforeEach(() => {
		pushHandlerRegistry.clear();
	});

	it('should register and retrieve a handler by type', () => {
		const handler = vi.fn();
		pushHandlerRegistry.register('executionFinished', handler);

		expect(pushHandlerRegistry.has('executionFinished')).toBe(true);
		expect(pushHandlerRegistry.get('executionFinished')).toBe(handler);
	});

	it('should return undefined for an unregistered type', () => {
		expect(pushHandlerRegistry.get('executionStarted')).toBeUndefined();
		expect(pushHandlerRegistry.has('executionStarted')).toBe(false);
	});

	it('should invoke the registered handler with the event and context', async () => {
		const handler = vi.fn();
		pushHandlerRegistry.register('executionStarted', handler);

		const event = { type: 'executionStarted', data: {} } as unknown as PushMessage;
		await pushHandlerRegistry.get('executionStarted')?.(event, context);

		expect(handler).toHaveBeenCalledWith(event, context);
	});

	it('should warn and keep the first handler when a type is registered twice', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const first = vi.fn();
		const second = vi.fn();

		pushHandlerRegistry.register('workflowActivated', first);
		pushHandlerRegistry.register('workflowActivated', second);

		expect(consoleSpy).toHaveBeenCalledWith(
			'Push handler for type "workflowActivated" is already registered. Skipping.',
		);
		expect(pushHandlerRegistry.get('workflowActivated')).toBe(first);

		consoleSpy.mockRestore();
	});

	it('should register every entry in a module pushHandlers map', () => {
		const activated = vi.fn();
		const deactivated = vi.fn();
		const handlers: ModulePushHandlers = {
			workflowActivated: activated,
			workflowDeactivated: deactivated,
		};

		pushHandlerRegistry.registerAll(handlers);

		expect(pushHandlerRegistry.getTypes()).toEqual(
			expect.arrayContaining(['workflowActivated', 'workflowDeactivated']),
		);
		expect(pushHandlerRegistry.get('workflowActivated')).toBeDefined();
	});

	it('should unregister a handler', () => {
		pushHandlerRegistry.register('workflowDeactivated', vi.fn());
		pushHandlerRegistry.unregister('workflowDeactivated');

		expect(pushHandlerRegistry.has('workflowDeactivated')).toBe(false);
	});
});
