import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { useBackendStatus } from './useBackendStatus';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';

const mockStartHeartbeat = vi.fn();
const mockStopHeartbeat = vi.fn();

vi.mock('@/app/push-connection/useHeartbeat', () => ({
	useHeartbeat: vi.fn(() => ({
		startHeartbeat: mockStartHeartbeat,
		stopHeartbeat: mockStopHeartbeat,
	})),
}));

describe('useBackendStatus', () => {
	let backendConnectionStore: ReturnType<typeof useBackendConnectionStore>;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		backendConnectionStore = useBackendConnectionStore();

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
				return useBackendStatus();
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

		expect(backendConnectionStore.isOnline).toBe(true);
		expect(mockStartHeartbeat).toHaveBeenCalled();

		wrapper.unmount();
	});

	it('should set offline status when backend connection fails', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(backendConnectionStore.isOnline).toBe(false);
		});

		wrapper.unmount();
	});

	it('should stop heartbeat on unmount', () => {
		const wrapper = createWrapper();
		wrapper.unmount();

		expect(mockStopHeartbeat).toHaveBeenCalled();
	});
});
