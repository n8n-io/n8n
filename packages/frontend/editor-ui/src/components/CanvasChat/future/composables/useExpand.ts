import { flattenLogEntries, type LogEntry } from '@/components/RunDataAi/utils';
import { computed, ref } from 'vue';

export function useExpand(entries: LogEntry[]) {
	const collapsedEntries = ref<Record<string, boolean>>({});
	const flatLogEntries = computed(() => flattenLogEntries(entries, collapsedEntries.value));

	function toggleExpanded(treeNode: LogEntry) {
		collapsedEntries.value[treeNode.id] = !collapsedEntries.value[treeNode.id];
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
