import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { watch, type Ref } from 'vue';

import { useTelemetry, type McpAppTelemetry } from '@mcp-apps/telemetry';
import { getMcpClientTelemetryProperties } from '@mcp-apps/telemetry/client-info';

import type { McpHostConnectionStatus } from './use-mcp-host-app';

type McpAppLifecycleTelemetryEvents = {
	rendered: string;
	renderFailed: string;
};

type UseMcpAppTelemetryOptions = {
	app: string;
	bootMs: Readonly<Ref<number | undefined>>;
	connectionError: Readonly<Ref<unknown>>;
	connectionStatus: Readonly<Ref<McpHostConnectionStatus>>;
	events: McpAppLifecycleTelemetryEvents;
	hostVersion: Readonly<Ref<Implementation | undefined>>;
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
	events,
	hostVersion,
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
				telemetry.track(events.rendered, {
					app,
					boot_ms: bootMs.value ?? Math.round(performance.now()),
					...getMcpClientTelemetryProperties(hostVersion.value),
				});
				return;
			}

			telemetry.track(events.renderFailed, {
				app,
				...getMcpClientTelemetryProperties(hostVersion.value),
				reason: getConnectionErrorReason(connectionError.value),
			});
		},
		{ immediate: true },
	);
}
