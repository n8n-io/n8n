import { anyAbortSignal } from '../abort-signal';

describe('anyAbortSignal', () => {
	it('returns the only defined signal', () => {
		const lease = new AbortController();

		expect(anyAbortSignal(undefined, lease.signal)).toBe(lease.signal);
	});

	it.each(['turn', 'lease', 'stop'] as const)('aborts when the %s signal aborts', (source) => {
		const controllers = {
			turn: new AbortController(),
			lease: new AbortController(),
			stop: new AbortController(),
		};
		const combined = anyAbortSignal(
			controllers.turn.signal,
			controllers.lease.signal,
			controllers.stop.signal,
		);

		controllers[source].abort();

		expect(combined.aborted).toBe(true);
	});
});
