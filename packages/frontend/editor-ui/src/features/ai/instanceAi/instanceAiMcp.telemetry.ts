import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';

type ToolsListSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.TOOLS_LIST_OPENED
>['source'];

type McpSettingsSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.MCP_SETTINGS_OPENED
>['source'];

type McpToolInclusionMode = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.MCP_TOOL_FILTER_SETTINGS_UPDATED
>['inclusion_mode'];

export function useInstanceAiMcpTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackToolsListOpened(source: ToolsListSource) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.TOOLS_LIST_OPENED, { source });
		},
		trackSettingsOpened(serverSlug: string, source: McpSettingsSource) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_SETTINGS_OPENED, {
				server_slug: serverSlug,
				source,
			});
		},
		trackFirstCredentialConnectionStart(serverSlug: string) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_FIRST_CREDENTIAL_CONNECTION_STARTED, {
				server_slug: serverSlug,
			});
		},
		trackCredentialDropdownOpened(serverSlug: string) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_CREDENTIAL_DROPDOWN_OPENED, {
				server_slug: serverSlug,
			});
		},
		trackExistingCredentialSelected(serverSlug: string) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_EXISTING_CREDENTIAL_SELECTED, {
				server_slug: serverSlug,
			});
		},
		trackNewCredentialConnectionStart(serverSlug: string) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_NEW_CREDENTIAL_CONNECTION_STARTED, {
				server_slug: serverSlug,
			});
		},
		trackToolFilterSettingsUpdated(serverSlug: string, inclusionMode: McpToolInclusionMode) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_TOOL_FILTER_SETTINGS_UPDATED, {
				server_slug: serverSlug,
				inclusion_mode: inclusionMode,
			});
		},
	};
}
