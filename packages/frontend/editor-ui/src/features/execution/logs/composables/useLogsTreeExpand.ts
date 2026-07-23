import {
	flattenLogEntries,
	getDefaultCollapsedEntries,
	hasSubExecution,
} from '@/features/execution/logs/logs.utils';
import { computed, shallowRef, type Ref } from 'vue';
import type { LogEntry } from '../logs.types';

export function useLogsTreeExpand(
	entries: Ref<LogEntry[]>,
	loadSubExecution: (logEntry: LogEntry) => Promise<void>,
) {
	// Explicit user toggles take precedence over per-entry defaults
	const userToggledCollapse = shallowRef<Record<string, boolean>>({});
	const collapsedEntries = computed<Record<string, boolean>>(() => ({
		...getDefaultCollapsedEntries(entries.value),
		...userToggledCollapse.value,
	}));
	const flatLogEntries = computed<LogEntry[]>(() =>
		flattenLogEntries(entries.value, collapsedEntries.value),
	);

	function toggleExpanded(treeNode: LogEntry, expand?: boolean) {
		if (hasSubExecution(treeNode) && treeNode.children.length === 0) {
			void loadSubExecution(treeNode);
			return;
		}

		userToggledCollapse.value = {
			...userToggledCollapse.value,
			[treeNode.id]: expand === undefined ? !collapsedEntries.value[treeNode.id] : !expand,
		};
	}

	return {
		flatLogEntries,
		toggleExpanded,
	};
}
