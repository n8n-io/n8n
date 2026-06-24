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
	// Ids the user has explicitly expanded/collapsed. Their choice always wins
	// over the computed defaults, even as the tree rebuilds while executing.
	const userToggled = new Set<string>();
	const flatLogEntries = computed<LogTreeEntry[]>(() =>
		flattenLogEntries(entries.value, collapsedEntries.value),
	);

	// (Re)apply default collapse state (groups collapse unless they contain an
	// error; empty sub-execution placeholders collapse) on every rebuild, leaving
	// any entry the user has manually toggled untouched. Re-applying — rather than
	// applying once — lets a group expand if a member errors after it first appears.
	watch(
		entries,
		(latest) => {
			const defaults = getDefaultCollapsedEntries(latest);
			const next: Record<string, boolean> = {};

			for (const id of userToggled) {
				if (collapsedEntries.value[id] !== undefined) {
					next[id] = collapsedEntries.value[id];
				}
			}

			for (const [id, collapsed] of Object.entries(defaults)) {
				if (!userToggled.has(id)) {
					next[id] = collapsed;
				}
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

		userToggled.add(treeNode.id);
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
