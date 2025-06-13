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
import { watch } from 'vue';
import { computed, ref, type ComputedRef } from 'vue';

export function useLogsSelection(
	execution: ComputedRef<IExecutionResponse | undefined>,
	tree: ComputedRef<LogEntry[]>,
	flatLogEntries: ComputedRef<LogEntry[]>,
	toggleExpand: (entry: LogEntry, expand?: boolean) => void,
) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = ref<LogEntrySelection>({ type: 'initial' });
	const selected = computed(() => findSelectedLogEntry(manualLogEntrySelection.value, tree.value));
	const logsStore = useLogsStore();
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();

	function syncSelectionToCanvasIfEnabled(value: LogEntry) {
		if (!logsStore.isLogSelectionSyncedWithCanvas) {
			return;
		}

		canvasEventBus.emit('nodes:select', { ids: [value.node.id], panIntoView: true });
	}

	function select(value: LogEntry | undefined) {
		manualLogEntrySelection.value =
			value === undefined ? { type: 'none' } : { type: 'selected', id: value.id };

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
		const prevEntry = selected.value
			? (getEntryAtRelativeIndex(entries, selected.value.id, -1) ?? entries[0])
			: entries[entries.length - 1];

		manualLogEntrySelection.value = { type: 'selected', id: prevEntry.id };
		syncSelectionToCanvasIfEnabled(prevEntry);
	}

	function selectNext() {
		const entries = flatLogEntries.value;
		const nextEntry = selected.value
			? (getEntryAtRelativeIndex(entries, selected.value.id, 1) ?? entries[entries.length - 1])
			: entries[0];

		manualLogEntrySelection.value = { type: 'selected', id: nextEntry.id };
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
			if (
				!shouldSync ||
				!selectedOnCanvas ||
				canvasStore.hasRangeSelection ||
				selected.value?.node.name === selectedOnCanvas
			) {
				return;
			}

			const entry = findLogEntryRec((e) => e.node.name === selectedOnCanvas, tree.value);

			if (!entry) {
				return;
			}

			manualLogEntrySelection.value = { type: 'selected', id: entry.id };

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
