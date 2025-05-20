import { flattenLogEntries, type LogEntry } from '@/components/RunDataAi/utils';
import { computed, ref, type ComputedRef } from 'vue';

export function useLogsTreeExpand(entries: ComputedRef<LogEntry[]>) {
	const collapsedEntries = ref<Record<string, boolean>>({});
	const flatLogEntries = computed(() => flattenLogEntries(entries.value, collapsedEntries.value));

	function toggleExpanded(treeNode: LogEntry) {
		collapsedEntries.value[treeNode.id] = !collapsedEntries.value[treeNode.id];
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
