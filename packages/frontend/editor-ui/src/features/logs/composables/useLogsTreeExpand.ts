import { flattenLogEntries } from '@/features/logs/logs.utils';
import { computed, ref, type ComputedRef } from 'vue';
import type { LogEntry } from '../logs.types';

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
