import { AI_GATEWAY_CREDENTIAL_TYPES } from '@n8n/constants';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { AI_GATEWAY_EXPERIMENT } from '@/app/constants';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';

export function useAiGateway() {
	const settingsStore = useSettingsStore();
	const postHogStore = usePostHog();
	const router = useRouter();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });

	const isEnabled = computed(
		() =>
			postHogStore.getVariant(AI_GATEWAY_EXPERIMENT.name) === AI_GATEWAY_EXPERIMENT.variant &&
			settingsStore.isAiGatewayEnabled,
	);
	const creditsQuota = computed(() => settingsStore.aiGatewayCreditsQuota);

	const isNodeSupported = (credentialType: string): boolean =>
		(AI_GATEWAY_CREDENTIAL_TYPES as readonly string[]).includes(credentialType);

	async function saveAfterToggle(): Promise<void> {
		await saveCurrentWorkflow({}, false, false, true);
	}

	return { isEnabled, creditsQuota, isNodeSupported, saveAfterToggle };
}
