import {
	type LogEntry,
	type LogEntrySelection,
	isGroupLog,
	isNodeLog,
} from '@/features/execution/logs/logs.types';
import {
	findLogEntryRec,
	findSelectedLogEntry,
	getDepth,
	getEntryAtRelativeIndex,
	isSubNodeLog,
} from '@/features/execution/logs/logs.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useUIStore } from '@/app/stores/ui.store';
import { shallowRef, watch } from 'vue';
import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export function useLogsSelection(
	execution: ComputedRef<IExecutionResponse | undefined>,
	tree: Ref<LogEntry[]>,
	flatLogEntries: ComputedRef<LogEntry[]>,
	toggleExpand: (entry: LogEntry, expand?: boolean) => void,
) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = shallowRef<LogEntrySelection>({ type: 'initial' });
	const nodeIdToSelect = shallowRef<string>();
	const isExecutionStopped = computed(() => execution.value?.stoppedAt !== undefined);
	const selected = computed(() =>
		findSelectedLogEntry(manualLogEntrySelection.value, tree.value, !isExecutionStopped.value),
	);
	const logsStore = useLogsStore();
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	function syncSelectionToCanvasIfEnabled(value: LogEntry) {
		if (!logsStore.isLogSelectionSyncedWithCanvas) {
			return;
		}

		// Selecting a group highlights its member nodes; the canvas maps a selected member
		// back to its group, so this works whether the group is collapsed or expanded.
		if (isGroupLog(value)) {
			canvasEventBus.emit('nodes:select', { ids: value.group.nodeIds, panIntoView: true });
			return;
		}

		canvasEventBus.emit('nodes:select', { ids: [value.node.id], panIntoView: true });
	}

	function select(value: LogEntry | undefined) {
		manualLogEntrySelection.value =
			value === undefined ? { type: 'none' } : { type: 'selected', entry: value };

		if (value) {
			syncSelectionToCanvasIfEnabled(value);

			if (isNodeLog(value)) {
				telemetry.track('User selected node in log view', {
					node_type: value.node.type,
					node_id: value.node.id,
					execution_id: execution.value?.id,
					workflow_id: execution.value?.workflowData.id,
					subworkflow_depth: getDepth(value),
				});
			} else if (isGroupLog(value)) {
				telemetry.track('User selected canvas group in log view', {
					group_id: value.group.id,
					node_count: value.group.nodeIds.length,
					execution_id: execution.value?.id,
					workflow_id: execution.value?.workflowData.id,
					subworkflow_depth: getDepth(value),
				});
			}
		}
	}

	function selectPrev() {
		const entries = flatLogEntries.value;

		if (entries.length === 0) {
			return;
		}

		const prevEntry = selected.value
			? (getEntryAtRelativeIndex(entries, selected.value.id, -1) ?? entries[0])
			: entries[entries.length - 1];

		manualLogEntrySelection.value = { type: 'selected', entry: prevEntry };
		syncSelectionToCanvasIfEnabled(prevEntry);
	}

	function selectNext() {
		const entries = flatLogEntries.value;

		if (entries.length === 0) {
			return;
		}

		const nextEntry = selected.value
			? (getEntryAtRelativeIndex(entries, selected.value.id, 1) ?? entries[entries.length - 1])
			: entries[0];

		manualLogEntrySelection.value = { type: 'selected', entry: nextEntry };
		syncSelectionToCanvasIfEnabled(nextEntry);
	}

	watch(
		selected,
		(sel) => {
			if (sel) {
				logsStore.setSubNodeSelected(isSubNodeLog(sel));
			}
		},
		{ immediate: true },
	);

	// Synchronize selection from canvas
	watch(
		[() => uiStore.lastSelectedNode, () => logsStore.isLogSelectionSyncedWithCanvas],
		([selectedOnCanvas, shouldSync]) => {
			const selectedNodeId = selectedOnCanvas
				? workflowDocumentStore.value.nodesByName[selectedOnCanvas]?.id
				: undefined;
			const selectedEntry = selected.value;
			const selectedEntryNodeId =
				selectedEntry && isNodeLog(selectedEntry) ? selectedEntry.node.id : undefined;

			// Keep a selected group row selected even when canvas highlights one of its members
			// (which happens as a result of our own logs->canvas sync)
			const isMemberOfSelectedGroup =
				selectedEntry !== undefined &&
				isGroupLog(selectedEntry) &&
				selectedNodeId !== undefined &&
				selectedEntry.group.nodeIds.includes(selectedNodeId);

			nodeIdToSelect.value =
				shouldSync &&
				!canvasStore.hasRangeSelection &&
				!isMemberOfSelectedGroup &&
				selectedEntryNodeId !== selectedNodeId
					? selectedNodeId
					: undefined;
		},
		{ immediate: true },
	);

	watch(
		[tree, nodeIdToSelect],
		([latestTree, id]) => {
			if (id === undefined) {
				return;
			}

			const entry = findLogEntryRec((e) => isNodeLog(e) && e.node.id === id, latestTree);

			if (!entry) {
				return;
			}

			nodeIdToSelect.value = undefined;
			manualLogEntrySelection.value = { type: 'selected', entry };

			let parent = entry.parent;

			while (parent !== undefined) {
				toggleExpand(parent, true);
				parent = parent.parent;
			}
		},
		{ immediate: true },
	);

	// Selecting a collapsed group on canvas selects that group's row in logs
	watch(
		[tree, () => canvasStore.selectedGroupId, () => logsStore.isLogSelectionSyncedWithCanvas],
		([latestTree, groupId, shouldSync]) => {
			if (!shouldSync || !groupId) {
				return;
			}

			const isGroupAlreadySelected =
				selected.value && isGroupLog(selected.value) && selected.value.group.id === groupId;

			if (isGroupAlreadySelected) {
				return;
			}

			const groupEntry = findLogEntryRec(
				(entry) => isGroupLog(entry) && entry.group.id === groupId,
				latestTree,
			);

			if (!groupEntry || !isGroupLog(groupEntry)) {
				return;
			}

			const isMemberNodeAlreadySelected =
				selected.value &&
				isNodeLog(selected.value) &&
				groupEntry.group.nodeIds.includes(selected.value.node.id);

			if (isMemberNodeAlreadySelected) {
				return;
			}

			manualLogEntrySelection.value = {
				type: 'selected',
				entry: groupEntry,
			};
		},
		{ immediate: true },
	);

	const erroredEntry = computed(() =>
		isExecutionStopped.value
			? findLogEntryRec((e) => isNodeLog(e) && !!e.runData?.error, tree.value)
			: undefined,
	);

	// A failed run surfaces the error over remembered view state, once per run
	watch(
		() => (erroredEntry.value ? execution.value?.id : undefined),
		(executionId) => {
			if (!executionId || !erroredEntry.value) {
				return;
			}

			manualLogEntrySelection.value = { type: 'initial' }; // auto-selects the errored node

			for (let parent = erroredEntry.value.parent; parent !== undefined; parent = parent.parent) {
				toggleExpand(parent, true);
			}
		},
	);

	return { selected, select, selectPrev, selectNext };
}
