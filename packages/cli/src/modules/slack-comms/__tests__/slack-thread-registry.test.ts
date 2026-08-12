import { SlackThreadRegistry } from '../slack-thread-registry';

describe('SlackThreadRegistry', () => {
	let registry: SlackThreadRegistry;

	beforeEach(() => {
		registry = new SlackThreadRegistry();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not treat an unknown thread as subscribed', () => {
		expect(registry.isSubscribed('1.1')).toBe(false);
	});

	it('subscribes and unsubscribes a thread', () => {
		registry.subscribe('1.1');
		expect(registry.isSubscribed('1.1')).toBe(true);
		registry.unsubscribe('1.1');
		expect(registry.isSubscribed('1.1')).toBe(false);
	});

	it('derives a thread id that is stable and per user', () => {
		const a = registry.threadIdFor('T1', 'C1', '1.1', 'u1');
		expect(registry.threadIdFor('T1', 'C1', '1.1', 'u1')).toBe(a);
		expect(registry.threadIdFor('T1', 'C1', '1.1', 'u2')).not.toBe(a);
	});

	it('derives a UUID-shaped thread id', () => {
		const id = registry.threadIdFor('T1', 'C1', '1.1', 'u1');
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('unsubscribes a thread left untouched for 30 minutes', () => {
		vi.useFakeTimers();
		registry = new SlackThreadRegistry();
		registry.subscribe('1.1');

		vi.advanceTimersByTime(36 * 60 * 1000);

		expect(registry.isSubscribed('1.1')).toBe(false);
	});

	it('keeps a thread subscribed when re-subscribed before the idle window elapses', () => {
		vi.useFakeTimers();
		registry = new SlackThreadRegistry();
		registry.subscribe('1.1');

		vi.advanceTimersByTime(20 * 60 * 1000);
		registry.subscribe('1.1');
		vi.advanceTimersByTime(20 * 60 * 1000);

		expect(registry.isSubscribed('1.1')).toBe(true);
	});
});
