import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';

export type AiGatewayTopUpSource = 'settings_page' | 'credential_selector';

export type AiGatewayTopUpVariant = 'member' | 'memberTrial' | 'ownerTrial';

export function useAiGatewayTopUp() {
	const uiStore = useUIStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const { goToCloudDashboard } = usePageRedirectionHelper();

	function resolveVariant(): AiGatewayTopUpVariant {
		if (usersStore.isInstanceOwner && cloudPlanStore.userIsTrialing) return 'ownerTrial';
		if (cloudPlanStore.userIsTrialing) return 'memberTrial';
		return 'member';
	}

	async function openTopUp(options: {
		source: AiGatewayTopUpSource;
		credentialType?: string;
	}): Promise<void> {
		telemetry.track('User clicked ai gateway top up', {
			source: options.source,
			credential_type: options.credentialType,
		});

		if (usersStore.isInstanceOwner && !cloudPlanStore.userIsTrialing) {
			try {
				await goToCloudDashboard({
					redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
					mode: 'open',
				});
			} catch (error) {
				toast.showError(error, i18n.baseText('aiGateway.topUp.modal.cta.openAdminPanelError'));
			}
			return;
		}

		uiStore.openModalWithData({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { variant: resolveVariant() },
		});
	}

	return { openTopUp };
}
