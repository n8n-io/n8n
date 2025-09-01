import type { LogEntry, LogEntrySelection } from '@/features/logs/logs.types';
import {
	findLogEntryRec,
	findSelectedLogEntry,
	getDepth,
	getEntryAtRelativeIndex,
	isSubNodeLog,
} from '@/features/logs/logs.utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { canvasEventBus } from '@/event-bus/canvas';
import type { IExecutionResponse } from '@/Interface';
import { useCanvasStore } from '@/stores/canvas.store';
import { useLogsStore } from '@/stores/logs.store';
import { useUIStore } from '@/stores/ui.store';
import { shallowRef, watch } from 'vue';
import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';

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
	const workflowsStore = useWorkflowsStore();

	function syncSelectionToCanvasIfEnabled(value: LogEntry) {
		if (!logsStore.isLogSelectionSyncedWithCanvas) {
			return;
		}

		canvasEventBus.emit('nodes:select', { ids: [value.node.id], panIntoView: true });
	}

	function select(value: LogEntry | undefined) {
		manualLogEntrySelection.value =
			value === undefined ? { type: 'none' } : { type: 'selected', entry: value };

		if (value) {
			syncSelectionToCanvasIfEnabled(value);

			telemetry.track('User selected node in log view', {
				node_type: value.node.type,
				node_id: value.node.id,
				execution_id: execution.value?.id,
				workflow_id: execution.value?.workflowData.id,
				subworkflow_depth: getDepth(value),
			});
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
				? workflowsStore.nodesByName[selectedOnCanvas]?.id
				: undefined;

			nodeIdToSelect.value =
				shouldSync && !canvasStore.hasRangeSelection && selected.value?.node.id !== selectedNodeId
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

			const entry = findLogEntryRec((e) => e.node.id === id, latestTree);

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
