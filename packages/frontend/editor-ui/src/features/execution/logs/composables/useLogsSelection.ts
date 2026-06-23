import {
	isLogGroupEntry,
	type LogEntrySelection,
	type LogTreeEntry,
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
import { createCanvasGroupNodeId } from '@/features/workflows/canvas/canvas.types';
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
	tree: Ref<LogTreeEntry[]>,
	flatLogEntries: ComputedRef<LogTreeEntry[]>,
	toggleExpand: (entry: LogTreeEntry, expand?: boolean) => void,
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

	function syncSelectionToCanvasIfEnabled(value: LogTreeEntry) {
		if (!logsStore.isLogSelectionSyncedWithCanvas) {
			return;
		}

		// A group maps to its collapsed group node on the canvas; a node maps to itself.
		const canvasId = isLogGroupEntry(value)
			? createCanvasGroupNodeId(value.group.id)
			: value.node.id;

		canvasEventBus.emit('nodes:select', { ids: [canvasId], panIntoView: true });
	}

	function select(value: LogTreeEntry | undefined) {
		manualLogEntrySelection.value =
			value === undefined ? { type: 'none' } : { type: 'selected', entry: value };

		if (value) {
			syncSelectionToCanvasIfEnabled(value);

			if (!isLogGroupEntry(value)) {
				telemetry.track('User selected node in log view', {
					node_type: value.node.type,
					node_id: value.node.id,
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
			const currentSelectedNodeId =
				selected.value && !isLogGroupEntry(selected.value) ? selected.value.node.id : undefined;

			nodeIdToSelect.value =
				shouldSync && !canvasStore.hasRangeSelection && currentSelectedNodeId !== selectedNodeId
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

			const entry = findLogEntryRec((e) => !isLogGroupEntry(e) && e.node.id === id, latestTree);

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

	return { selected, select, selectPrev, selectNext };
}
