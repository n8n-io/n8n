import { useTelemetry } from '@n8n/composables/useTelemetry';
import type { McpToolPermissions } from '@n8n/api-types';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';

type ToolsListSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.TOOLS_LIST_OPENED
>['source'];

type McpSettingsSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.MCP_SETTINGS_OPENED
>['source'];

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
		trackToolPermissionsUpdated(serverSlug: string, permissions: McpToolPermissions) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_TOOL_PERMISSIONS_UPDATED, {
				server_slug: serverSlug,
				read_permission: permissions.categories.read,
				write_permission: permissions.categories.write,
				tool_override_count: Object.keys(permissions.tools ?? {}).length,
			});
		},
	};
}
