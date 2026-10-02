import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

import { AGENTS_N8N_CHAT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';

function isAgentsN8nChatFlagEnabled(): boolean {
	const variant = usePostHog().getVariant(AGENTS_N8N_CHAT_FLAG);
	return typeof variant === 'string' && variant !== AGENTS_N8N_CHAT_EXPERIMENT.control;
}

/**
 * Gates the agent builder's n8n Chat surfaces (channel row, modal, chip). The
 * flag is multivariate: every variant turns them on, `control` keeps them off.
 */
export const useAgentsN8nChatFlag = () => computed(isAgentsN8nChatFlagEnabled);

/**
 * Distinguishes the two active arms of the n8n Chat experiment, for surfaces
 * (like the Instance AI empty state) that behave differently per variant.
 * Both arms stay off while the agents module is inactive: their agent lists would fail.
 */
export function useAgentsN8nChatVariant() {
	const posthog = usePostHog();
	const settingsStore = useSettingsStore();
	const variant = computed(() =>
		settingsStore.isModuleActive('agents') ? posthog.getVariant(AGENTS_N8N_CHAT_FLAG) : undefined,
	);
	return {
		isVariantA: computed(() => variant.value === AGENTS_N8N_CHAT_EXPERIMENT.variantA),
		isVariantB: computed(() => variant.value === AGENTS_N8N_CHAT_EXPERIMENT.variantB),
	};
}

const FLAG_WAIT_TIMEOUT_MS = 3000;

/**
 * Waits for a pending client-side flag evaluation before a deep link fails closed.
 * `waitForFeatureFlagsWithTimeout` resolves immediately when nothing is pending, so
 * this doesn't need its own `hasPendingFeatureFlags()` guard.
 */
export async function isAgentsN8nChatFlagEnabledOnceEvaluated(): Promise<boolean> {
	await waitForFeatureFlagsWithTimeout(usePostHog(), FLAG_WAIT_TIMEOUT_MS);
	return isAgentsN8nChatFlagEnabled();
}
