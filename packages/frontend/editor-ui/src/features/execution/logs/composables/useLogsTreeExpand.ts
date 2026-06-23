import {
	flattenLogEntries,
	getDefaultCollapsedEntries,
	hasSubExecution,
} from '@/features/execution/logs/logs.utils';
import { computed, shallowRef, watch, type Ref } from 'vue';
import { isLogGroupEntry, type LogTreeEntry } from '../logs.types';

export function useLogsTreeExpand(
	entries: Ref<LogTreeEntry[]>,
	loadSubExecution: (logEntry: LogTreeEntry) => Promise<void>,
) {
	const collapsedEntries = shallowRef<Record<string, boolean>>({});
	// Entry ids we've already applied a default collapse state for, so user
	// toggles aren't overwritten when the tree rebuilds (e.g. while executing).
	const appliedDefaults = new Set<string>();
	const flatLogEntries = computed<LogTreeEntry[]>(() =>
		flattenLogEntries(entries.value, collapsedEntries.value),
	);

	// Apply default collapse state (groups + empty sub-execution placeholders)
	// the first time each entry appears, without clobbering existing choices.
	watch(
		entries,
		(latest) => {
			const defaults = getDefaultCollapsedEntries(latest);
			const pending = Object.entries(defaults).filter(([id]) => !appliedDefaults.has(id));

			if (pending.length === 0) {
				return;
			}

			const next = { ...collapsedEntries.value };
			for (const [id, collapsed] of pending) {
				next[id] = collapsed;
				appliedDefaults.add(id);
			}
			collapsedEntries.value = next;
		},
		{ immediate: true },
	);

	function toggleExpanded(treeNode: LogTreeEntry, expand?: boolean) {
		if (!isLogGroupEntry(treeNode) && hasSubExecution(treeNode) && treeNode.children.length === 0) {
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
