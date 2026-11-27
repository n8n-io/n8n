import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerVitePreloadErrorHandler } from '@/app/plugins/vitePreloadError';
import { isModalPrefetchRunning } from '@/app/composables/usePrefetchModals';

vi.mock('@/app/composables/usePrefetchModals', () => ({
	isModalPrefetchRunning: vi.fn(() => false),
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
});
