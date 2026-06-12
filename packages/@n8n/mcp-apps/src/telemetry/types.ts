import type { McpAppTelemetryConfig } from '../telemetry-contract';

declare global {
	interface Window {
		// Must match MCP_APP_TELEMETRY_GLOBAL in ../telemetry-contract.
		__N8N_MCP_TELEMETRY__?: McpAppTelemetryConfig;
	}
}

export {};
