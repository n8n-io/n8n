import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { AI_GATEWAY_EXPERIMENT } from '@/app/constants';

const MANAGED_CREDENTIAL_TYPES = ['googlePalmApi', 'anthropicApi'] as const;

export function useAiGateway() {
	const settingsStore = useSettingsStore();
	const postHogStore = usePostHog();

	const isEnabled = computed(
		() =>
			postHogStore.getVariant(AI_GATEWAY_EXPERIMENT.name) === AI_GATEWAY_EXPERIMENT.variant &&
			settingsStore.isAiGatewayEnabled,
	);
	const creditsQuota = computed(() => settingsStore.aiGatewayCreditsQuota);

	const isNodeSupported = (credentialType: string): boolean =>
		(MANAGED_CREDENTIAL_TYPES as readonly string[]).includes(credentialType);

	return { isEnabled, creditsQuota, isNodeSupported };
}
