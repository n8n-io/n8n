import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import merge from 'lodash/merge';
import { useBackendStatus } from './useBackendStatus';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defaultSettings } from '@/__tests__/defaults';

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
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		backendConnectionStore = useBackendConnectionStore();
		settingsStore = useSettingsStore();
		settingsStore.setSettings(
			merge({}, defaultSettings, {
				endpointHealth: '/internal/health',
			}),
		);

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
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ status: 'ok' }),
		});

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith('/internal/health', {
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

	it('should prepend backend origin to health URL when baseUrl is a full URL', async () => {
		const rootStore = useRootStore();
		vi.spyOn(rootStore, 'baseUrl', 'get').mockReturnValue('http://localhost:5678/');

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ status: 'ok' }),
		});

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith('http://localhost:5678/internal/health', {
				cache: 'no-store',
				signal: expect.any(AbortSignal),
			});
		});

		wrapper.unmount();
	});

	it('should skip health checks in preview mode', async () => {
		settingsStore.setSettings(
			merge({}, defaultSettings, {
				previewMode: true,
				endpointHealth: '/internal/health',
			}),
		);

		const wrapper = createWrapper();

		await vi.waitFor(() => {
			expect(mockFetch).not.toHaveBeenCalled();
			expect(mockStartHeartbeat).not.toHaveBeenCalled();
		});

		wrapper.unmount();
	});
});
