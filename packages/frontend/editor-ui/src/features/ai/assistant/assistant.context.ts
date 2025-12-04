import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { computed } from 'vue';

export function useAssistantContext() {
	const ndvStore = useNDVStore();
	return computed(() => ndvStore.activeNodeName ?? 'Workflow');
}
