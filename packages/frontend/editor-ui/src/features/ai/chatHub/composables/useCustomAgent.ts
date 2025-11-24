import type { ChatHubAgentDto } from '@n8n/api-types';
import { ref, toValue, watch, type MaybeRef } from 'vue';
import { useChatStore } from '../chat.store';

export function useCustomAgent(agentId?: MaybeRef<string | undefined>) {
	const store = useChatStore();
	const agent = ref<ChatHubAgentDto>();

	watch(
		() => toValue(agentId),
		async (id) => {
			if (id) {
				agent.value = await store.fetchCustomAgent(id);
			}
		},
		{ immediate: true },
	);

	return agent;
}
