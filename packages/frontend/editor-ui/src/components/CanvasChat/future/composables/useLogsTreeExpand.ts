import { flattenLogEntries, type LogEntry } from '@/components/RunDataAi/utils';
import { computed, ref, type ComputedRef } from 'vue';

export function useLogsTreeExpand(entries: ComputedRef<LogEntry[]>) {
	const collapsedEntries = ref<Record<string, boolean>>({});
	const flatLogEntries = computed(() => flattenLogEntries(entries.value, collapsedEntries.value));

	function toggleExpanded(treeNode: LogEntry, expand?: boolean) {
		collapsedEntries.value[treeNode.id] =
			expand === undefined ? !collapsedEntries.value[treeNode.id] : !expand;
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
