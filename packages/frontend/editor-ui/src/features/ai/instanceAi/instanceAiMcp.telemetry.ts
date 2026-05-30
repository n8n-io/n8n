import { useTelemetry } from '@/app/composables/useTelemetry';

/**
 * Frontend funnel telemetry for the MCP-in-Instance-AI surface. State-change
 * events (connected/disconnected) are tracked by the backend; this file is for
 * the steps before/around them so we can measure drop-off in the add flow.
 */
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
