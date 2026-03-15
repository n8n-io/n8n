import { describe, it, expect, vi } from 'vitest';

import { LocalEventRelay } from '../event-relay';

describe('LocalEventRelay', () => {
	it('broadcast() should be a no-op (no subscribers called)', () => {
		const relay = new LocalEventRelay();
		const handler = vi.fn();
		relay.onBroadcast(handler);

		relay.broadcast({
			type: 'step:completed',
			eventId: 'evt-1',
			createdAt: Date.now(),
			executionId: 'exec-1',
			stepId: 'step-1',
			output: { result: true },
			durationMs: 100,
		});

		// No-op: local bus already delivered. Relay does nothing.
		expect(handler).not.toHaveBeenCalled();
	});

	it('should implement EventRelay interface', () => {
		const relay = new LocalEventRelay();
		expect(relay.broadcast).toBeTypeOf('function');
		expect(relay.onBroadcast).toBeTypeOf('function');
		expect(relay.close).toBeTypeOf('function');
	});

	it('should close without errors', async () => {
		const relay = new LocalEventRelay();
		await expect(relay.close()).resolves.toBeUndefined();
	});
});
