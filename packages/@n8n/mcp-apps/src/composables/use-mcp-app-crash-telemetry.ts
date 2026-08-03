import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { onBeforeUnmount, onMounted, type Ref } from 'vue';

import { useTelemetry, type McpAppTelemetry } from '@mcp-apps/telemetry';
import { getMcpClientTelemetryProperties } from '@mcp-apps/telemetry/client-info';
import { sanitizeTelemetryErrorMessage } from '@mcp-apps/telemetry/sanitize';

type UseMcpAppCrashTelemetryOptions = {
	app: string;
	event: string;
	hostVersion: Readonly<Ref<Implementation | undefined>>;
	sources: {
		appError: string;
		appUnhandledRejection: string;
	};
	telemetry?: McpAppTelemetry;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return 'unknown';
}

export function useMcpAppCrashTelemetry({
	app,
	event,
	hostVersion,
	sources,
	telemetry = useTelemetry(),
}: UseMcpAppCrashTelemetryOptions) {
	const trackCrash = (source: string, error: unknown) => {
		telemetry.track(event, {
			app,
			...getMcpClientTelemetryProperties(hostVersion.value),
			error_message: sanitizeTelemetryErrorMessage(getErrorMessage(error)),
			source,
		});
	};

	const handleError = (event: ErrorEvent) => {
		trackCrash(sources.appError, event.error ?? event.message);
	};

	const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
		trackCrash(sources.appUnhandledRejection, event.reason);
	};

	onMounted(() => {
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
	});

	onBeforeUnmount(() => {
		window.removeEventListener('error', handleError);
		window.removeEventListener('unhandledrejection', handleUnhandledRejection);
	});
}
