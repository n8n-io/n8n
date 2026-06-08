import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref, shallowRef } from 'vue';

import type { McpAppTelemetry } from '@mcp-apps/telemetry';

import { useMcpAppTelemetry } from './use-mcp-app-telemetry';
import type { McpHostConnectionStatus } from './use-mcp-host-app';

function createTelemetryMock() {
	return {
		init: vi.fn(),
		track: vi.fn(),
	} as unknown as McpAppTelemetry;
}

const events = {
	rendered: 'Test app rendered',
	renderFailed: 'Test app render failed',
};

describe('useMcpAppTelemetry', () => {
	beforeEach(() => {
		vi.spyOn(performance, 'now').mockReturnValue(123.4);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('tracks rendered after the MCP host connection succeeds', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');
		const bootMs = ref(42);

		useMcpAppTelemetry({
			app: 'workflow-preview',
			bootMs,
			connectionError: shallowRef<unknown>(),
			connectionStatus,
			events,
			telemetry,
		});

		connectionStatus.value = 'connected';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith('Test app rendered', {
			app: 'workflow-preview',
			boot_ms: 42,
		});
	});

	it('tracks render failure after the MCP host connection fails', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');
		const connectionError = shallowRef<unknown>(new Error('host unavailable'));

		useMcpAppTelemetry({
			app: 'workflow-preview',
			bootMs: ref(),
			connectionError,
			connectionStatus,
			events,
			telemetry,
		});

		connectionStatus.value = 'failed';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith('Test app render failed', {
			app: 'workflow-preview',
			reason: 'host unavailable',
		});
	});

	it('uses current performance time if bootMs is not available', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('connected');

		useMcpAppTelemetry({
			app: 'workflow-preview',
			bootMs: ref(),
			connectionError: shallowRef<unknown>(),
			connectionStatus,
			events,
			telemetry,
		});

		await nextTick();

		expect(telemetry.track).toHaveBeenCalledWith('Test app rendered', {
			app: 'workflow-preview',
			boot_ms: 123,
		});
	});

	it('tracks the connection result only once', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');

		useMcpAppTelemetry({
			app: 'workflow-preview',
			bootMs: ref(42),
			connectionError: shallowRef<unknown>(),
			connectionStatus,
			events,
			telemetry,
		});

		connectionStatus.value = 'connected';
		await nextTick();
		connectionStatus.value = 'failed';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledTimes(1);
	});
});
