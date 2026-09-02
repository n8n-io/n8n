import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
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
	renderFailed: 'Test app render failed',
};
const renderFailedReason = 'host_connection_failed';

const hostVersion = shallowRef<Implementation>({ name: 'Claude Desktop', version: '1.2.3' });

describe('useMcpAppTelemetry', () => {
	it('initializes telemetry after the MCP host connection succeeds without tracking success', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');

		useMcpAppTelemetry({
			app: 'workflow-preview',
			connectionError: shallowRef<unknown>(),
			connectionStatus,
			events,
			hostVersion,
			renderFailedReason,
			telemetry,
		});

		connectionStatus.value = 'connected';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('tracks render failure after the MCP host connection fails', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');
		const connectionError = shallowRef<unknown>(new Error('host unavailable'));

		useMcpAppTelemetry({
			app: 'workflow-preview',
			connectionError,
			connectionStatus,
			events,
			hostVersion,
			renderFailedReason,
			telemetry,
		});

		connectionStatus.value = 'failed';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith('Test app render failed', {
			app: 'workflow-preview',
			error_message: 'host unavailable',
			mcp_client_name: 'Claude Desktop',
			mcp_client_version: '1.2.3',
			reason: 'host_connection_failed',
		});
	});

	it('tracks the connection result only once', async () => {
		const telemetry = createTelemetryMock();
		const connectionStatus = ref<McpHostConnectionStatus>('pending');

		useMcpAppTelemetry({
			app: 'workflow-preview',
			connectionError: shallowRef<unknown>(),
			connectionStatus,
			events,
			hostVersion,
			renderFailedReason,
			telemetry,
		});

		connectionStatus.value = 'connected';
		await nextTick();
		connectionStatus.value = 'failed';
		await nextTick();

		expect(telemetry.init).toHaveBeenCalledTimes(1);
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
