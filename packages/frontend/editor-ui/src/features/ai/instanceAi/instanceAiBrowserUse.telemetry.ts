import { useTelemetry } from '@/app/composables/useTelemetry';

export function useInstanceAiBrowserUseTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackModalOpened() {
			telemetry.track('Instance AI Connect Browser Use modal opened');
		},
		trackInstallExtensionClicked() {
			telemetry.track('Instance AI Install Chrome Browser Extension button clicked');
		},
		trackOpenExtensionClicked() {
			telemetry.track('Instance AI Open Browser Use Extension button clicked');
		},
	};
}
