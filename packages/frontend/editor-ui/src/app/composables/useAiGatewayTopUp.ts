import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

export type AiGatewayTopUpSource = 'settings_page' | 'credential_selector';

/**
 * Opens the top-up flow for n8n credits.
 *
 * Paid Cloud Instance Owners go straight to the Cloud Admin Panel. Everyone else
 * gets a dialog: trial owners are asked to upgrade, members are told who can top up.
 */
export function useAiGatewayTopUp() {
	const uiStore = useUIStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();

	async function openAdminPanel(): Promise<void> {
		// Reserve the tab in the click gesture so the later auto-login navigation
		// isn't treated as a popup.
		const tab = window.open('', '_blank');
		try {
			const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
				redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
			});
			if (tab) {
				tab.location.href = link;
			} else {
				window.location.href = link;
			}
		} catch (error) {
			tab?.close();
			toast.showError(error, i18n.baseText('aiGateway.topUp.modal.cta.openAdminPanelError'));
		}
	}

	function openTopUp(options: { source: AiGatewayTopUpSource; credentialType?: string }): void {
		telemetry.track('User clicked ai gateway top up', {
			source: options.source,
			credential_type: options.credentialType,
		});

		if (
			settingsStore.isCloudDeployment &&
			usersStore.isInstanceOwner &&
			!cloudPlanStore.userIsTrialing
		) {
			void openAdminPanel();
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
