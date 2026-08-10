import { useTelemetry } from '@n8n/composables/useTelemetry';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

export type AiGatewayTopUpSource = 'settings_page' | 'credential_selector';

/**
 * Opens the top-up flow for n8n credits.
 *
 * Always the modal: it explains what credits cover before handing a paid Cloud Instance Owner
 * on to the Cloud Admin Panel, and tells everyone else who can top up on their behalf.
 */
export function useAiGatewayTopUp() {
	const uiStore = useUIStore();
	const telemetry = useTelemetry();

	function openTopUp(options: { source: AiGatewayTopUpSource; credentialType?: string }): void {
		telemetry.track('User clicked ai gateway top up', {
			source: options.source,
			credential_type: options.credentialType,
		});

		uiStore.openModalWithData({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: {
				credentialType: options.credentialType,
				source: options.source,
			},
		});
	}

	return { openTopUp };
}
