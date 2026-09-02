import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { isBrowserUseSupportedForBrowser } from '@/experiments/instanceAiBrowserUse';

export type BrowserUseModalSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_MODAL_OPENED
>['source'];

export function useInstanceAiBrowserUseTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackModalOpened(source: BrowserUseModalSource) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_MODAL_OPENED, {
				browser_supported: isBrowserUseSupportedForBrowser(),
				source,
			});
		},
		trackInstallExtensionClicked() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_INSTALL_EXTENSION_CLICKED, {});
		},
		trackOpenExtensionClicked() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_OPEN_EXTENSION_CLICKED, {});
		},
		trackDirectConnectRequested() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_DIRECT_CONNECT_REQUESTED, {});
		},
	};
}
