import { flattenLogEntries, hasSubExecution } from '@/features/logs/logs.utils';
import { computed, shallowRef, type Ref } from 'vue';
import type { LogEntry } from '../logs.types';

export function useLogsTreeExpand(
	entries: Ref<LogEntry[]>,
	loadSubExecution: (logEntry: LogEntry) => Promise<void>,
) {
	const collapsedEntries = shallowRef<Record<string, boolean>>({});
	const flatLogEntries = computed<LogEntry[]>(() =>
		flattenLogEntries(entries.value, collapsedEntries.value),
	);

	function toggleExpanded(treeNode: LogEntry, expand?: boolean) {
		if (hasSubExecution(treeNode) && treeNode.children.length === 0) {
			void loadSubExecution(treeNode);
			return;
		}

		collapsedEntries.value = {
			...collapsedEntries.value,
			[treeNode.id]: expand === undefined ? !collapsedEntries.value[treeNode.id] : !expand,
		};
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
