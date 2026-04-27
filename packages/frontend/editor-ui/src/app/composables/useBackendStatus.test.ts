import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackendStatus } from './useBackendStatus';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/app/push-connection/useHeartbeat', () => ({
	useHeartbeat: vi.fn(({ onHeartbeat }: { onHeartbeat: () => void }) => {
		const callbacks = {
			onHeartbeat,
		};
		return {
			startHeartbeat: vi.fn(() => {
				// Store callback for manual triggering in tests
				(global as any).__heartbeatCallback = callbacks.onHeartbeat;
			}),
			stopHeartbeat: vi.fn(),
		};
	}),
}));

describe('useBackendStatus - GHC-7862', () => {
	let backendConnectionStore: ReturnType<typeof useBackendConnectionStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let rootStore: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		backendConnectionStore = useBackendConnectionStore();
		settingsStore = useSettingsStore();
		rootStore = useRootStore();

		// Setup default values
		settingsStore.endpointHealth = '/healthz';
		rootStore.baseUrl = 'http://localhost:5678';
		settingsStore.isPreviewMode = false;

		// Clear any previous heartbeat callback
		delete (global as any).__heartbeatCallback;

		// Reset fetch mock
		vi.clearAllMocks();
	});

	it('should mark backend as offline when health check fails', async () => {
		// Mock fetch to simulate failing health check
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		useBackendStatus();

		// Trigger the heartbeat callback
		const heartbeatCallback = (global as any).__heartbeatCallback;
		if (heartbeatCallback) {
			heartbeatCallback();
		}

		// Wait for async operations
		await vi.waitFor(() => {
			expect(backendConnectionStore.isOnline).toBe(false);
		});
	});

	it('should mark backend as offline when health check times out', async () => {
		// Mock fetch to simulate timeout (never resolves)
		global.fetch = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					// Never resolve to simulate timeout
					setTimeout(() => resolve({ ok: false }), 10000);
				}),
		);

		useBackendStatus();

		// Trigger the heartbeat callback
		const heartbeatCallback = (global as any).__heartbeatCallback;
		if (heartbeatCallback) {
			heartbeatCallback();
		}

		// Wait for the health check to timeout (should abort after 5s)
		await vi.waitFor(
			() => {
				expect(backendConnectionStore.isOnline).toBe(false);
			},
			{ timeout: 6000 },
		);
	});

	it('should recover connection status when health check succeeds after failure', async () => {
		// Start with failing health check
		let shouldFail = true;
		global.fetch = vi.fn().mockImplementation(() => {
			if (shouldFail) {
				return Promise.reject(new Error('Network error'));
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({ status: 'ok' }),
			});
		});

		useBackendStatus();

		// Trigger heartbeat - should fail
		let heartbeatCallback = (global as any).__heartbeatCallback;
		if (heartbeatCallback) {
			heartbeatCallback();
		}

		await vi.waitFor(() => {
			expect(backendConnectionStore.isOnline).toBe(false);
		});

		// Now make health check succeed
		shouldFail = false;

		// Trigger heartbeat again - should succeed
		heartbeatCallback = (global as any).__heartbeatCallback;
		if (heartbeatCallback) {
			heartbeatCallback();
		}

		await vi.waitFor(() => {
			expect(backendConnectionStore.isOnline).toBe(true);
		});
	});

	it('should not trigger rapid disconnections within health check interval', async () => {
		// This test reproduces the reported issue: connection drops every 2-3 seconds
		// Expected: Health checks run every 10 seconds, so rapid disconnections should not occur
		const healthCheckCalls: number[] = [];

		global.fetch = vi.fn().mockImplementation(() => {
			healthCheckCalls.push(Date.now());
			return Promise.resolve({
				ok: true,
				json: async () => ({ status: 'ok' }),
			});
		});

		useBackendStatus();

		// Trigger multiple heartbeats rapidly (simulating the reported bug)
		const heartbeatCallback = (global as any).__heartbeatCallback;
		for (let i = 0; i < 5; i++) {
			if (heartbeatCallback) {
				heartbeatCallback();
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// All checks should succeed - no rapid disconnections
		expect(backendConnectionStore.isOnline).toBe(true);
		expect(healthCheckCalls.length).toBeGreaterThan(0);
	});

	it('should handle concurrent health check requests gracefully', async () => {
		let requestCount = 0;
		global.fetch = vi.fn().mockImplementation(() => {
			requestCount++;
			return new Promise((resolve) => {
				setTimeout(
					() =>
						resolve({
							ok: true,
							json: async () => ({ status: 'ok' }),
						}),
					100,
				);
			});
		});

		useBackendStatus();

		// Trigger multiple concurrent heartbeats
		const heartbeatCallback = (global as any).__heartbeatCallback;
		const promises = [];
		for (let i = 0; i < 10; i++) {
			if (heartbeatCallback) {
				promises.push(
					new Promise((resolve) => {
						heartbeatCallback();
						resolve(undefined);
					}),
				);
			}
		}

		await Promise.all(promises);
		await vi.waitFor(() => {
			expect(backendConnectionStore.isOnline).toBe(true);
		});

		// Should not make 10 concurrent requests - the 'checking' flag should prevent this
		// This tests the bug where multiple concurrent health checks could cause race conditions
		expect(requestCount).toBeLessThan(10);
	});
});
