import { describe, it, expect } from 'vitest';

import { LocalEventRelay } from '../event-relay';
import { RedisEventRelay } from '../redis-event-relay';

describe('Engine relay selection', () => {
	it('LocalEventRelay implements EventRelay interface', () => {
		const local = new LocalEventRelay();
		expect(local.broadcast).toBeTypeOf('function');
		expect(local.onBroadcast).toBeTypeOf('function');
		expect(local.close).toBeTypeOf('function');
	});

	it('RedisEventRelay implements EventRelay interface', () => {
		expect(RedisEventRelay.prototype.broadcast).toBeTypeOf('function');
		expect(RedisEventRelay.prototype.onBroadcast).toBeTypeOf('function');
		expect(RedisEventRelay.prototype.close).toBeTypeOf('function');
		expect(RedisEventRelay.prototype.getStatus).toBeTypeOf('function');
	});

	it('LocalEventRelay broadcast is a no-op', () => {
		const local = new LocalEventRelay();
		// Should not throw
		expect(() => {
			local.broadcast({
				type: 'step:started',
				executionId: 'e1',
				stepId: 's1',
				attempt: 1,
				eventId: 'ev1',
				createdAt: Date.now(),
			});
		}).not.toThrow();
	});

	it('LocalEventRelay close resolves cleanly', async () => {
		const local = new LocalEventRelay();
		await expect(local.close()).resolves.toBeUndefined();
	});
});
