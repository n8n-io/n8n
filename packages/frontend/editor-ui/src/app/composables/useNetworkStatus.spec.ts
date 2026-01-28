import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useNetworkStatus } from './useNetworkStatus';
import { useNetworkStore } from '@/app/stores/network.store';

const mockStartHeartbeat = vi.fn();
const mockStopHeartbeat = vi.fn();

vi.mock('@/app/push-connection/useHeartbeat', () => ({
	useHeartbeat: vi.fn(() => ({
		startHeartbeat: mockStartHeartbeat,
		stopHeartbeat: mockStopHeartbeat,
	})),
}));

describe('useNetworkStatus', () => {
	let networkStore: ReturnType<typeof useNetworkStore>;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		networkStore = useNetworkStore();

		mockFetch = vi.fn();
		vi.stubGlobal('fetch', mockFetch);

		mockStartHeartbeat.mockClear();
		mockStopHeartbeat.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	const createWrapper = () => {
		const TestComponent = defineComponent({
			setup() {
				return useNetworkStatus();
			},
			template: '<div></div>',
		});

		return mount(TestComponent);
	};

	it('should check backend connection and set online status on mount', async () => {
		mockFetch.mockResolvedValueOnce({ ok: true });

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith('/healthz', {
				cache: 'no-store',
				signal: expect.any(AbortSignal),
			});
		});

		expect(networkStore.isOnline).toBe(true);
		expect(mockStartHeartbeat).toHaveBeenCalled();

		wrapper.unmount();
	});

	it('should set offline status when backend connection fails', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(networkStore.isOnline).toBe(false);
		});

		wrapper.unmount();
	});

	it('should set offline when browser offline event fires', () => {
		mockFetch.mockResolvedValue({ ok: true });
		networkStore.setOnline(true);

		const wrapper = createWrapper();

		window.dispatchEvent(new Event('offline'));

		expect(networkStore.isOnline).toBe(false);
		expect(mockStopHeartbeat).toHaveBeenCalled();

		wrapper.unmount();
	});

	it('should verify backend connection when browser online event fires', async () => {
		mockFetch.mockResolvedValue({ ok: true });

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});
		await flushPromises();

		mockFetch.mockClear();

		networkStore.setOnline(false);
		window.dispatchEvent(new Event('online'));

		await flushPromises();

		expect(mockFetch).toHaveBeenCalled();
		expect(networkStore.isOnline).toBe(true);

		wrapper.unmount();
	});

	it('should clean up event listeners on unmount', () => {
		const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		const wrapper = createWrapper();
		wrapper.unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
		expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
		expect(mockStopHeartbeat).toHaveBeenCalled();
	});
});
