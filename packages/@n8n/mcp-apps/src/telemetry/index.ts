import {
	ANONYMOUS_IP_CONTEXT,
	loadRudderStack,
	sanitizeTelemetryProperties,
	type RudderStack,
} from '@n8n/telemetry-frontend';

import { MCP_APP_TELEMETRY_GLOBAL, type McpAppTelemetryConfig } from '../telemetry-contract';

export class McpAppTelemetry {
	private config?: McpAppTelemetryConfig;
	private ready = false;

	private get rudderStack(): RudderStack | undefined {
		return window.rudderanalytics;
	}

	init(config: McpAppTelemetryConfig | undefined = window[MCP_APP_TELEMETRY_GLOBAL]): void {
		if (this.ready) return;
		if (!config?.enabled || !config.writeKey || !config.dataPlaneUrl || !config.configUrl) return;

		try {
			loadRudderStack({
				writeKey: config.writeKey,
				dataPlaneUrl: config.dataPlaneUrl,
				options: {
					configUrl: config.configUrl,
					// `All` is RudderStack's required key for disabling all destinations.
					// eslint-disable-next-line @typescript-eslint/naming-convention
					integrations: { All: false },
					loadIntegration: false,
				},
			});
			this.config = config;
			this.ready = true;
		} catch {
			// Telemetry is best-effort and must never block rendering.
			this.ready = false;
		}
	}

	track(event: string, properties: Record<string, unknown> = {}): void {
		if (!this.ready || !this.config) return;

		try {
			const sanitizedProperties = sanitizeTelemetryProperties(properties);

			this.rudderStack?.track(
				event,
				{
					...sanitizedProperties,
					instance_id: this.config.instanceId,
					version_cli: this.config.versionCli,
				},
				ANONYMOUS_IP_CONTEXT,
			);
		} catch {
			// Best-effort: never let telemetry break the app.
		}
	}
}

export const telemetry = new McpAppTelemetry();

export function useTelemetry(): McpAppTelemetry {
	return telemetry;
}
