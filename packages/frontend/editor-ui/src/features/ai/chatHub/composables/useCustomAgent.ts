import { computed, ref, toValue, watch, type MaybeRef } from 'vue';
import { useChatStore } from '../chat.store';

export function useCustomAgent(agentId?: MaybeRef<string | undefined>) {
	const store = useChatStore();
	const isLoading = ref(false);
	const id = computed(() => toValue(agentId));
	const customAgent = computed(() => {
		if (!id.value) {
			return undefined;
		}

		return store.customAgents[id.value];
	});

	watch(
		id,
		async (theId) => {
			if (theId) {
				try {
					isLoading.value = true;
					await store.fetchCustomAgent(theId);
				} finally {
					isLoading.value = false;
				}
			}
		},
		{ immediate: true },
	);

	return { isLoading, customAgent };
}
