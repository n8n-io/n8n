import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';

const MANAGED_CREDENTIAL_TYPES = ['googlePalmApi', 'anthropicApi'] as const;

export function useAiGateway() {
	const settingsStore = useSettingsStore();

	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);
	const creditsQuota = computed(() => settingsStore.aiGatewayCreditsQuota);

	const isNodeSupported = (credentialType: string): boolean =>
		(MANAGED_CREDENTIAL_TYPES as readonly string[]).includes(credentialType);

	return { isEnabled, creditsQuota, isNodeSupported };
}
