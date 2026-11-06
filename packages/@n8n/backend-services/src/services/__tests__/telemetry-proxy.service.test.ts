import { defineTelemetryEvents } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod/v4';

import { TelemetryProxy, type TelemetryTracker } from '../telemetry-proxy.service';

const EVENTS = defineTelemetryEvents({
	TEST_EVENT: {
		name: 'Test event',
		description: 'An event for tests.',
		properties: z.object({ user_id: z.string() }),
	},
});

describe('TelemetryProxy', () => {
	it('drops events and reports telemetry as off when no provider is registered', () => {
		const proxy = new TelemetryProxy();

		expect(() => proxy.track('Some event', { user_id: 'user-1' })).not.toThrow();
		expect(() => proxy.track(EVENTS.TEST_EVENT, { user_id: 'user-1' })).not.toThrow();
		expect(() => proxy.addBufferFlusher(vi.fn())).not.toThrow();
		expect(proxy.isEnabled()).toBe(false);
	});

	it('delegates events with a name to the registered provider', () => {
		const proxy = new TelemetryProxy();
		const provider = mock<TelemetryTracker>();
		proxy.registerProvider(provider);

		proxy.track('Some event', { user_id: 'user-1' });
		proxy.track('Event without properties');

		expect(provider.track).toHaveBeenCalledWith('Some event', { user_id: 'user-1' });
		expect(provider.track).toHaveBeenCalledWith('Event without properties', undefined);
	});

	it('delegates registry events to the registered provider', () => {
		const proxy = new TelemetryProxy();
		const provider = mock<TelemetryTracker>();
		proxy.registerProvider(provider);

		proxy.track(EVENTS.TEST_EVENT, { user_id: 'user-1' });

		expect(provider.track).toHaveBeenCalledWith(EVENTS.TEST_EVENT, { user_id: 'user-1' });
	});

	it('delegates isEnabled and addBufferFlusher to the registered provider', () => {
		const proxy = new TelemetryProxy();
		const provider = mock<TelemetryTracker>();
		provider.isEnabled.mockReturnValue(true);
		proxy.registerProvider(provider);
		const flusher = vi.fn();

		proxy.addBufferFlusher(flusher);

		expect(proxy.isEnabled()).toBe(true);
		expect(provider.addBufferFlusher).toHaveBeenCalledWith(flusher);
	});

	it('passes flushers added before registration to the provider once', () => {
		const proxy = new TelemetryProxy();
		const provider = mock<TelemetryTracker>();
		const flusher = vi.fn();

		proxy.addBufferFlusher(flusher);
		proxy.registerProvider(provider);
		proxy.registerProvider(provider);

		expect(provider.addBufferFlusher).toHaveBeenCalledExactlyOnceWith(flusher);
	});
});
