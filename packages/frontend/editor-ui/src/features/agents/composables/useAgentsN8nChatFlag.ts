import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Gates the agent builder's n8n Chat surfaces (channel row, modal, chip). The
 * flag is multivariate: every variant turns them on, `control` keeps them off.
 */
export const useAgentsN8nChatFlag = () => {
	const postHog = usePostHog();
	return computed(() => {
		const variant = postHog.getVariant(AGENTS_N8N_CHAT_FLAG);
		return typeof variant === 'string' && variant !== 'control';
	});
};
