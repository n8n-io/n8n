import { useTelemetry } from '@/app/composables/useTelemetry';
import type { McpToolInclusionMode } from '@/features/shared/toolsConnection/types';

export function useInstanceAiMcpTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackToolsListOpened() {
			telemetry.track('Instance AI tools list opened');
		},
		trackSettingsOpened(serverSlug: string) {
			telemetry.track('Instance AI mcp settings opened', { server_slug: serverSlug });
		},
		trackFirstCredentialConnectionStart(serverSlug: string) {
			telemetry.track('Instance AI mcp first credential connection start', {
				server_slug: serverSlug,
			});
		},
		trackCredentialDropdownOpened(serverSlug: string) {
			telemetry.track('Instance AI mcp credential dropdown opened', {
				server_slug: serverSlug,
			});
		},
		trackExistingCredentialSelected(serverSlug: string) {
			telemetry.track('Instance AI mcp existing credential selected', {
				server_slug: serverSlug,
			});
		},
		trackNewCredentialConnectionStart(serverSlug: string) {
			telemetry.track('Instance AI mcp new credential connection start', {
				server_slug: serverSlug,
			});
		},
		trackToolFilterSettingsUpdated(serverSlug: string, inclusionMode: McpToolInclusionMode) {
			telemetry.track('Instance AI mcp tool filter settings updated', {
				server_slug: serverSlug,
				inclusion_mode: inclusionMode,
			});
		},
	};
}
