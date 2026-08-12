import type { RudderStack } from '@/app/plugins/telemetry/telemetry.types';

import type { McpAppTelemetryConfig } from '../telemetry-contract';

declare global {
	interface Window {
		// Identical to the declaration in editor-ui's telemetry plugin
		// (@/app/plugins/telemetry/telemetry.types), which shares this TS
		// program since the app bundles the editor canvas. Merged `Window`
		// declarations must match exactly.
		rudderanalytics: RudderStack;
		// Must match MCP_APP_TELEMETRY_GLOBAL in ../telemetry-contract.
		__N8N_MCP_TELEMETRY__?: McpAppTelemetryConfig;
	}
}

/**
 * RudderStack JS SDK surface used by the MCP app UI. Re-exported from
 * editor-ui's telemetry plugin so both `Window.rudderanalytics` global
 * augmentations refer to the same type.
 */
export type { RudderStack };
