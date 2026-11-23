import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	registerVitePreloadErrorHandler,
	reloadAfterPreloadError,
} from '@/app/plugins/vitePreloadError';
import { isModalPrefetchRunning } from '@/app/composables/usePrefetchModals';
import { awaitRoutePreload, isRoutePreloadPending } from '@/app/utils/routePreload';

vi.mock('@/app/composables/usePrefetchModals', () => ({
	isModalPrefetchRunning: vi.fn(() => false),
}));

vi.mock('@/app/utils/routePreload', () => ({
	isRoutePreloadPending: vi.fn(() => false),
	awaitRoutePreload: vi.fn(async () => true),
}));

const STORAGE_KEY = 'n8n:vite-preload-reloaded-at';

function dispatchPreloadError() {
	const event = new Event('vite:preloadError', { cancelable: true });
	window.dispatchEvent(event);
	return event;
}

describe('registerVitePreloadErrorHandler', () => {
	let reloadSpy: ReturnType<typeof vi.fn>;
	let originalLocation: Location;
	let unregister: () => void;

	beforeEach(() => {
		sessionStorage.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

		originalLocation = window.location;
		reloadSpy = vi.fn();
		vi.mocked(isModalPrefetchRunning).mockReturnValue(false);
		vi.mocked(isRoutePreloadPending).mockReturnValue(false);
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, reload: reloadSpy },
		});

		unregister = registerVitePreloadErrorHandler();
	});

	afterEach(() => {
		unregister();
		vi.useRealTimers();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: originalLocation,
		});
		sessionStorage.clear();
	});

	it('reloads and stores a timestamp on the first preload error', () => {
		const event = dispatchPreloadError();

		expect(reloadSpy).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
		expect(Number(sessionStorage.getItem(STORAGE_KEY))).toBe(Date.now());
	});

	it('does not reload on a second preload error within the throttle window', () => {
		dispatchPreloadError();
		vi.advanceTimersByTime(5_000);
		const event = dispatchPreloadError();

		expect(reloadSpy).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(false);
	});

	it('reloads again after the throttle window has elapsed', () => {
		dispatchPreloadError();
		vi.advanceTimersByTime(10_001);
		dispatchPreloadError();

		expect(reloadSpy).toHaveBeenCalledTimes(2);
	});

	it('does not reload when a modal prefetch fails', () => {
		vi.mocked(isModalPrefetchRunning).mockReturnValue(true);

		const event = dispatchPreloadError();

		expect(reloadSpy).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	describe('while the early load of the first route is pending', () => {
		function holdRoutePreload() {
			let settle: (loaded: boolean) => void = () => {};
			vi.mocked(isRoutePreloadPending).mockReturnValue(true);
			vi.mocked(awaitRoutePreload).mockReturnValue(
				new Promise((resolve) => {
					settle = resolve;
				}),
			);
			return (loaded: boolean) => {
				vi.mocked(isRoutePreloadPending).mockReturnValue(false);
				settle(loaded);
			};
		}

		it('does not reload and does not prevent the default', () => {
			holdRoutePreload();

			const event = dispatchPreloadError();

			expect(reloadSpy).not.toHaveBeenCalled();
			expect(event.defaultPrevented).toBe(false);
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		});

		it('reloads once when the early load then succeeds', async () => {
			const settle = holdRoutePreload();

			dispatchPreloadError();
			dispatchPreloadError();
			settle(true);
			await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
			await Promise.resolve();

			expect(reloadSpy).toHaveBeenCalledTimes(1);
		});

		it('does not reload when the early load then fails', async () => {
			const settle = holdRoutePreload();

			dispatchPreloadError();
			settle(false);
			await vi.mocked(awaitRoutePreload).mock.results[0]?.value;
			await Promise.resolve();

			expect(reloadSpy).not.toHaveBeenCalled();
		});
	});

	describe('reloadAfterPreloadError', () => {
		it('reloads and returns true, then returns false within the throttle window', () => {
			expect(reloadAfterPreloadError()).toBe(true);
			vi.advanceTimersByTime(5_000);
			expect(reloadAfterPreloadError()).toBe(false);

			expect(reloadSpy).toHaveBeenCalledTimes(1);
		});
	});
});
