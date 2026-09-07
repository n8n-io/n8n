import type { McpAppTelemetryConfig } from '../telemetry-contract';

declare global {
	interface Window {
		rudderanalytics?: RudderStack;
		// Must match MCP_APP_TELEMETRY_GLOBAL in ../telemetry-contract.
		__N8N_MCP_TELEMETRY__?: McpAppTelemetryConfig;
	}
}

/**
 * Minimal subset of the RudderStack JS SDK surface used by the MCP app UI.
 * Mirrors the shape of the v1 browser snippet, which buffers calls until the
 * SDK script loads and replaces the stub.
 */
export interface RudderStack extends Array<unknown> {
	[key: string]: unknown;

	methods: string[];
	factory: (method: string) => (...args: unknown[]) => RudderStack;
	loadJS(): void;

	load(writeKey: string, dataPlaneUrl: string, options?: object): void;
	ready(): void;
	track(event: string, properties?: object, options?: object): void;
	identify(id?: string, traits?: object, options?: object): void;
	reset(): void;
}

export {};
