import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

export function useAiGateway() {
	const settingsStore = useSettingsStore();
	const router = useRouter();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });
	const aiGatewayStore = useAiGatewayStore();

	const creditsRemaining = computed(() => aiGatewayStore.creditsRemaining);
	const creditsQuota = computed(() => aiGatewayStore.creditsQuota);
	const fetchError = computed(() => aiGatewayStore.fetchError);

	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);

	async function fetchCredits(): Promise<void> {
		if (!isEnabled.value) return;
		await aiGatewayStore.fetchCredits();
	}

	const isCredentialTypeSupported = (credentialType: string): boolean =>
		aiGatewayStore.isCredentialTypeSupported(credentialType);

	async function fetchConfig(): Promise<void> {
		if (!isEnabled.value) return;
		await aiGatewayStore.fetchConfig();
	}

	async function saveAfterToggle(): Promise<void> {
		await saveCurrentWorkflow({}, false, false, true);
	}

	return {
		isEnabled,
		creditsRemaining,
		creditsQuota,
		fetchError,
		fetchConfig,
		fetchCredits,
		isCredentialTypeSupported,
		saveAfterToggle,
	};
}
