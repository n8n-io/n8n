import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { AI_GATEWAY_EXPERIMENT } from '@/app/constants';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { getGatewayCredits } from '@/features/ai/assistant/assistant.api';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

export function useAiGateway() {
	const settingsStore = useSettingsStore();
	const postHogStore = usePostHog();
	const rootStore = useRootStore();
	const router = useRouter();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });
	const aiGatewayStore = useAiGatewayStore();

	const isEnabled = computed(
		() =>
			postHogStore.getVariant(AI_GATEWAY_EXPERIMENT.name) === AI_GATEWAY_EXPERIMENT.variant &&
			settingsStore.isAiGatewayEnabled,
	);

	const creditsRemaining = ref<number | undefined>(undefined);
	const creditsQuota = ref<number | undefined>(undefined);

	async function fetchCredits(): Promise<void> {
		if (!isEnabled.value) return;
		try {
			const data = await getGatewayCredits(rootStore.restApiContext);
			creditsRemaining.value = data.creditsRemaining;
			creditsQuota.value = data.creditsQuota;
		} catch (error) {
			console.error('[useAiGateway] Failed to fetch credits:', error);
		}
	}

	const isNodeSupported = (credentialType: string): boolean =>
		aiGatewayStore.isCredentialTypeSupported(credentialType);

	async function saveAfterToggle(): Promise<void> {
		await saveCurrentWorkflow({}, false, false, true);
	}

	return {
		isEnabled,
		creditsRemaining,
		creditsQuota,
		fetchCredits,
		isNodeSupported,
		saveAfterToggle,
	};
}
