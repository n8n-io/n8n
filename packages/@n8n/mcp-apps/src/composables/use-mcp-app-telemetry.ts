import { watch, type Ref } from 'vue';

import { MCP_APP_EVENTS, useTelemetry, type McpAppTelemetry } from '@mcp-apps/telemetry';

import type { McpHostConnectionStatus } from './use-mcp-host-app';

type UseMcpAppTelemetryOptions = {
	app: string;
	bootMs: Readonly<Ref<number | undefined>>;
	connectionError: Readonly<Ref<unknown>>;
	connectionStatus: Readonly<Ref<McpHostConnectionStatus>>;
	telemetry?: McpAppTelemetry;
};

function getConnectionErrorReason(error: unknown): string {
	return error instanceof Error ? error.message : 'unknown';
}

export function useMcpAppTelemetry({
	app,
	bootMs,
	connectionError,
	connectionStatus,
	telemetry = useTelemetry(),
}: UseMcpAppTelemetryOptions) {
	let trackedConnection = false;

	watch(
		connectionStatus,
		(status) => {
			if (trackedConnection || status === 'pending') return;

			trackedConnection = true;
			telemetry.init();

			if (status === 'connected') {
				telemetry.track(MCP_APP_EVENTS.PREVIEW_RENDERED, {
					app,
					boot_ms: bootMs.value ?? Math.round(performance.now()),
				});
				return;
			}

			telemetry.track(MCP_APP_EVENTS.PREVIEW_RENDER_FAILED, {
				app,
				reason: getConnectionErrorReason(connectionError.value),
			});
		},
		{ immediate: true },
	);
}
