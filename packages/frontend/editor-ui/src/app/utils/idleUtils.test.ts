import { DEBOUNCE_TIME } from '@/app/constants';
import { runWhenIdle } from '@/app/utils/idleUtils';

describe('runWhenIdle', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('should run the callback via requestIdleCallback when available', () => {
		const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
			callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
			return 1;
		});
		vi.stubGlobal('requestIdleCallback', requestIdleCallback);
		const fn = vi.fn();

		runWhenIdle(fn, { timeout: 1234 });

		expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1234 });
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should use the telemetry batch debounce time as the default timeout', () => {
		const requestIdleCallback = vi.fn();
		vi.stubGlobal('requestIdleCallback', requestIdleCallback);

		runWhenIdle(vi.fn());

		expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
			timeout: DEBOUNCE_TIME.TELEMETRY.BATCH,
		});
	});

	it('should fall back to a macrotask when requestIdleCallback is unavailable', () => {
		vi.stubGlobal('requestIdleCallback', undefined);
		vi.useFakeTimers();
		const fn = vi.fn();

		runWhenIdle(fn);

		expect(fn).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should swallow errors thrown by the callback', () => {
		vi.stubGlobal(
			'requestIdleCallback',
			vi.fn((callback: IdleRequestCallback) => {
				callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
				return 1;
			}),
		);

		expect(() =>
			runWhenIdle(() => {
				throw new Error('boom');
			}),
		).not.toThrow();
	});
});
