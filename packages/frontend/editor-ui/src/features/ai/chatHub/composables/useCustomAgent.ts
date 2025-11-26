import type { ChatHubAgentDto } from '@n8n/api-types';
import { ref, toValue, watch, type MaybeRef } from 'vue';
import { useChatStore } from '../chat.store';
import { useToast } from '@/app/composables/useToast';

export function useCustomAgent(agentId?: MaybeRef<string | undefined>) {
	const store = useChatStore();
	const agent = ref<ChatHubAgentDto>();
	const toast = useToast();

	watch(
		() => toValue(agentId),
		async (id) => {
			if (!id) {
				agent.value = undefined;
				return;
			}

			try {
				agent.value = await store.fetchCustomAgent(id);
			} catch (error) {
				toast.showError(error, 'Failed to load agent');
			}
		},
		{ immediate: true },
	);

	return agent;
}
