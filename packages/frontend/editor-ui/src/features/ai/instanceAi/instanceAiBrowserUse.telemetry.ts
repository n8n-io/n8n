import { useTelemetry } from '@n8n/composables/useTelemetry';

export function useInstanceAiBrowserUseTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackModalOpened(browserSupported: boolean) {
			telemetry.track('Instance AI Connect Browser Use modal opened', {
				browser_supported: browserSupported,
			});
		},
		trackInstallExtensionClicked() {
			telemetry.track('Instance AI Install Chrome Browser Extension button clicked');
		},
		trackOpenExtensionClicked() {
			telemetry.track('Instance AI Open Browser Use Extension button clicked');
		},
	};
}
