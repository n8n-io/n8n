import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

export type AiGatewayTopUpSource = 'settings_page' | 'credential_selector';

/**
 * Opens the top-up flow for n8n credits.
 *
 * Paid Cloud Instance Owners go straight to the Cloud Admin Panel top-up page.
 * Members, admins, and anyone on trial see an explanatory modal instead.
 *
 * `CLOUD_N8N_CONNECT_TOP_UP_PATH` is a placeholder until Cloud ships the final URL.
 */
export function useAiGatewayTopUp() {
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();

	async function openTopUp(options: {
		source: AiGatewayTopUpSource;
		credentialType?: string;
	}): Promise<void> {
		telemetry.track('User clicked ai gateway top up', {
			source: options.source,
			credential_type: options.credentialType,
		});

		const canTopUpDirectly =
			usersStore.isInstanceOwner &&
			!cloudPlanStore.userIsTrialing &&
			settingsStore.isCloudDeployment;

		if (canTopUpDirectly) {
			const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
				redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
			});
			window.open(link, '_blank', 'noopener');
			return;
		}

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
