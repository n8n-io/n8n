import { useToast } from '@n8n/composables/useToast';
import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiReady } from './useInstanceAiAvailability';

export function useSelfHealingChatHandoff(): SelfHealingChatHandoff {
	const available = useInstanceAiReady();
	const router = useRouter();
	const { showError } = useToast();
	const i18n = useI18n();

	async function start({ threadId }: SelfHealingChatInput): Promise<boolean> {
		if (!available.value) return false;
		try {
			const failure = await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
			if (failure) throw failure;
			return true;
		} catch (cause) {
			showError(cause, i18n.baseText('inbox.selfHealing.action.chatError'));
			return false;
		}
	}

	return { available, start };
}
