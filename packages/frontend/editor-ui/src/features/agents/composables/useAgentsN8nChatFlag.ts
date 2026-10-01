import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';

function isAgentsN8nChatFlagEnabled(): boolean {
	const variant = usePostHog().getVariant(AGENTS_N8N_CHAT_FLAG);
	return typeof variant === 'string' && variant !== 'control';
}

/**
 * Gates the agent builder's n8n Chat surfaces (channel row, modal, chip). The
 * flag is multivariate: every variant turns them on, `control` keeps them off.
 */
export const useAgentsN8nChatFlag = () => computed(isAgentsN8nChatFlagEnabled);

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
