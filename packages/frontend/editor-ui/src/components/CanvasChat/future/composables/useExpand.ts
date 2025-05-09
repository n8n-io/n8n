import {
	flattenLogEntries,
	type ExecutionLogViewData,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { computed, ref, type ComputedRef } from 'vue';

export function useExpand(execution: ComputedRef<ExecutionLogViewData | undefined>) {
	const collapsedEntries = ref<Record<string, boolean>>({});
	const flatLogEntries = computed(() =>
		flattenLogEntries(execution.value?.tree ?? [], collapsedEntries.value),
	);

	function toggleExpanded(treeNode: LogEntry) {
		collapsedEntries.value[treeNode.id] = !collapsedEntries.value[treeNode.id];
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
