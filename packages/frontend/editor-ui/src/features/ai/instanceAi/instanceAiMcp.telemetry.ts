import { useTelemetry } from '@/app/composables/useTelemetry';

export function useInstanceAiMcpTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackAddMenuMcpSelected() {
			telemetry.track('Instance AI mcp add menu selected');
		},
		trackModalOpened() {
			telemetry.track('Instance AI mcp modal opened');
		},
		trackSettingsOpened(serverSlug: string) {
			telemetry.track('Instance AI mcp settings opened', { server_slug: serverSlug });
		},
	};
}
