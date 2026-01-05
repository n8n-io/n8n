import { computed, toValue, watch, type MaybeRef } from 'vue';
import { useChatStore } from '../chat.store';

export function useCustomAgent(agentId?: MaybeRef<string | undefined>) {
	const store = useChatStore();
	const id = computed(() => toValue(agentId));
	const agent = computed(() => {
		if (!id.value) {
			return undefined;
		}

		return store.customAgents[id.value];
	});

	watch(
		id,
		(theId) => {
			if (theId) {
				void store.fetchCustomAgent(theId);
			}
		},
		{ immediate: true },
	);

	return agent;
}
