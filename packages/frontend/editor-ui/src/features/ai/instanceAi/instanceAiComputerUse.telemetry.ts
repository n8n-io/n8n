import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';

export type ComputerUseModalSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_MODAL_OPENED
>['source'];

export type ComputerUseOs = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_CONNECTION_COMMAND_COPIED
>['os'];

export function useInstanceAiComputerUseTelemetry() {
	const telemetry = useTelemetry();

	return {
		trackModalOpened(isConnected: boolean, source: ComputerUseModalSource) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_MODAL_OPENED, {
				is_connected: isConnected,
				source,
			});
		},
		trackCommandCopied(os: ComputerUseOs) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_CONNECTION_COMMAND_COPIED, {
				os,
			});
		},
	};
}
