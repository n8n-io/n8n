import { defineComponent, h, nextTick, ref } from 'vue';
import { cleanup, render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { isModalPrefetchRunning, usePrefetchModals } from '@/app/composables/usePrefetchModals';
import {
	MODAL_PREFETCH_FALLBACK_DELAY,
	MODAL_PREFETCH_IDLE_TIMEOUT,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/app/constants';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { lazyModalLoaders, type LazyModalKey } from '@/app/modals/lazyModals';

// Replace every real loader with a spy, so no test loads modal code.
vi.mock('@/app/modals/lazyModals', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/modals/lazyModals')>();
	const loaders = Object.fromEntries(
		Object.keys(actual.lazyModalLoaders).map((key) => [key, vi.fn(async () => ({}))]),
	);
	return { ...actual, lazyModalLoaders: loaders };
});

const KEYS: LazyModalKey[] = [
	WORKFLOW_SETTINGS_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
];

const loader = (key: LazyModalKey) => vi.mocked<() => Promise<unknown>>(lazyModalLoaders[key]);

function renderPage(options?: Parameters<typeof usePrefetchModals>[1]) {
	const Page = defineComponent({
		setup() {
			usePrefetchModals(KEYS, options);
			return () => h('div');
		},
	});
	return render(Page);
}

describe('usePrefetchModals', () => {
	let idleCallbacks: IdleRequestCallback[];
	let requestIdleCallback: ReturnType<typeof vi.fn>;
	let cancelIdleCallback: ReturnType<typeof vi.fn>;

	/** Runs the oldest pending idle callback, then lets its load settle. */
	async function runNextIdle() {
		const callback = idleCallbacks.shift();
		if (!callback) throw new Error('No idle callback is pending');
		callback({ didTimeout: false, timeRemaining: () => 50 });
		await flushPromises();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		idleCallbacks = [];
		let nextHandle = 0;
		requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
			idleCallbacks.push(callback);
			return ++nextHandle;
		});
		cancelIdleCallback = vi.fn();
		vi.stubGlobal('requestIdleCallback', requestIdleCallback);
		vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);
	});

	afterEach(() => {
		// Unmount while the stubs still exist: unmount cancels the pending idle callback.
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.useRealTimers();
		Reflect.deleteProperty(navigator, 'connection');
	});

	it('waits for idle after mount before it loads the first modal', async () => {
		renderPage();

		expect(requestIdleCallback).toHaveBeenCalledTimes(1);
		expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
			timeout: MODAL_PREFETCH_IDLE_TIMEOUT,
		});
		await flushPromises();
		for (const key of KEYS) expect(loader(key)).not.toHaveBeenCalled();

		await runNextIdle();

		expect(loader(WORKFLOW_SETTINGS_MODAL_KEY)).toHaveBeenCalledTimes(1);
		expect(loader(CREDENTIAL_EDIT_MODAL_KEY)).not.toHaveBeenCalled();
	});

	it('loads each next modal only after the next idle callback', async () => {
		renderPage();

		await runNextIdle();
		expect(requestIdleCallback).toHaveBeenCalledTimes(2);
		expect(loader(CREDENTIAL_EDIT_MODAL_KEY)).not.toHaveBeenCalled();

		await runNextIdle();
		expect(loader(CREDENTIAL_EDIT_MODAL_KEY)).toHaveBeenCalledTimes(1);
		expect(loader(WORKFLOW_SHARE_MODAL_KEY)).not.toHaveBeenCalled();

		await runNextIdle();
		expect(loader(WORKFLOW_SHARE_MODAL_KEY)).toHaveBeenCalledTimes(1);
		expect(idleCallbacks).toHaveLength(0);
		expect(requestIdleCallback).toHaveBeenCalledTimes(3);
		for (const key of KEYS) expect(loader(key)).toHaveBeenCalledTimes(1);
	});

	it('uses a timeout when requestIdleCallback does not exist', async () => {
		vi.stubGlobal('requestIdleCallback', undefined);
		vi.useFakeTimers();
		const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

		renderPage();

		expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), MODAL_PREFETCH_FALLBACK_DELAY);
		vi.advanceTimersByTime(MODAL_PREFETCH_FALLBACK_DELAY - 1);
		expect(loader(WORKFLOW_SETTINGS_MODAL_KEY)).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(loader(WORKFLOW_SETTINGS_MODAL_KEY)).toHaveBeenCalledTimes(1);
	});

	it('loads nothing when the page unmounts before idle', async () => {
		const { unmount } = renderPage();

		unmount();

		expect(cancelIdleCallback).toHaveBeenCalledWith(1);
		for (const key of KEYS) expect(loader(key)).not.toHaveBeenCalled();
	});

	it('loads no further modal after the page unmounts', async () => {
		const { unmount } = renderPage();
		await runNextIdle();

		unmount();

		expect(cancelIdleCallback).toHaveBeenCalledWith(2);
		expect(loader(CREDENTIAL_EDIT_MODAL_KEY)).not.toHaveBeenCalled();
	});

	it('schedules nothing when it is not enabled', async () => {
		renderPage({ enabled: () => false });
		await flushPromises();

		expect(requestIdleCallback).not.toHaveBeenCalled();
		for (const key of KEYS) expect(loader(key)).not.toHaveBeenCalled();
	});

	it('starts when it becomes enabled after mount', async () => {
		const enabled = ref(false);
		renderPage({ enabled: () => enabled.value });
		await flushPromises();
		expect(requestIdleCallback).not.toHaveBeenCalled();

		enabled.value = true;
		await nextTick();
		expect(requestIdleCallback).toHaveBeenCalledTimes(1);

		await runNextIdle();
		expect(loader(WORKFLOW_SETTINGS_MODAL_KEY)).toHaveBeenCalledTimes(1);
	});

	it('starts only once when it is enabled again', async () => {
		const enabled = ref(true);
		renderPage({ enabled: () => enabled.value });

		enabled.value = false;
		await nextTick();
		enabled.value = true;
		await nextTick();

		expect(requestIdleCallback).toHaveBeenCalledTimes(1);
	});

	it('starts only once when it is enabled again after a late start', async () => {
		const enabled = ref(false);
		renderPage({ enabled: () => enabled.value });
		enabled.value = true;
		await nextTick();

		enabled.value = false;
		await nextTick();
		enabled.value = true;
		await nextTick();

		expect(requestIdleCallback).toHaveBeenCalledTimes(1);
	});

	it('schedules nothing when it becomes enabled after the page unmounts', async () => {
		const enabled = ref(false);
		const { unmount } = renderPage({ enabled: () => enabled.value });

		unmount();
		enabled.value = true;
		await nextTick();

		expect(requestIdleCallback).not.toHaveBeenCalled();
	});

	it('schedules nothing when the user turned on data saving', async () => {
		vi.useFakeTimers();
		const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
		Object.defineProperty(navigator, 'connection', {
			configurable: true,
			value: { saveData: true },
		});

		renderPage();
		vi.runAllTimers();

		expect(requestIdleCallback).not.toHaveBeenCalled();
		expect(setTimeoutSpy).not.toHaveBeenCalledWith(
			expect.any(Function),
			MODAL_PREFETCH_FALLBACK_DELAY,
		);
		for (const key of KEYS) expect(loader(key)).not.toHaveBeenCalled();
	});

	it('prefetches when the connection does not save data', async () => {
		Object.defineProperty(navigator, 'connection', {
			configurable: true,
			value: { saveData: false },
		});

		renderPage();
		await runNextIdle();

		expect(loader(WORKFLOW_SETTINGS_MODAL_KEY)).toHaveBeenCalledTimes(1);
	});

	it('reports a running prefetch only while a load runs', async () => {
		let finishLoad = () => {};
		loader(WORKFLOW_SETTINGS_MODAL_KEY).mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					finishLoad = () => resolve({});
				}),
		);
		renderPage();
		expect(isModalPrefetchRunning()).toBe(false);

		idleCallbacks.shift()?.({ didTimeout: false, timeRemaining: () => 50 });
		expect(isModalPrefetchRunning()).toBe(true);

		finishLoad();
		await flushPromises();
		expect(isModalPrefetchRunning()).toBe(false);
	});

	it('ignores a failed load and still loads the next modal', async () => {
		const unhandledRejection = vi.fn();
		process.on('unhandledRejection', unhandledRejection);
		loader(WORKFLOW_SETTINGS_MODAL_KEY).mockRejectedValueOnce(new Error('Chunk load failed'));

		try {
			renderPage();
			await runNextIdle();
			expect(isModalPrefetchRunning()).toBe(false);

			await runNextIdle();
			expect(loader(CREDENTIAL_EDIT_MODAL_KEY)).toHaveBeenCalledTimes(1);

			// Unhandled rejections are reported after a macrotask.
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(unhandledRejection).not.toHaveBeenCalled();
		} finally {
			process.off('unhandledRejection', unhandledRejection);
		}
	});
});
