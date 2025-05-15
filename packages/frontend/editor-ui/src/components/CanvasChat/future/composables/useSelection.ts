import type { LogEntrySelection } from '@/components/CanvasChat/types/logs';
import {
	findSelectedLogEntry,
	getDepth,
	getEntryAtRelativeIndex,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { canvasEventBus } from '@/event-bus/canvas';
import type { IExecutionResponse } from '@/Interface';
import { useLogsStore } from '@/stores/logs.store';
import { useUIStore } from '@/stores/ui.store';
import { watch } from 'vue';
import { computed, ref, type ComputedRef } from 'vue';

export function useSelection(
	execution: ComputedRef<IExecutionResponse | undefined>,
	tree: ComputedRef<LogEntry[]>,
	flatLogEntries: ComputedRef<LogEntry[]>,
) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = ref<LogEntrySelection>({ type: 'initial' });
	const selected = computed(() => findSelectedLogEntry(manualLogEntrySelection.value, tree.value));
	const logsStore = useLogsStore();
	const uiStore = useUIStore();

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

	// Synchronize selection from canvas
	watch(
		[() => uiStore.lastSelectedNode, () => logsStore.isLogSelectionSyncedWithCanvas],
		([selectedOnCanvas, shouldSync]) => {
			if (!shouldSync || !selectedOnCanvas) {
				return;
			}

			const selectedId =
				manualLogEntrySelection.value.type === 'selected'
					? manualLogEntrySelection.value.id
					: undefined;
			const selectedEntry = selectedId
				? flatLogEntries.value.find((e) => e.id === selectedId)
				: undefined;

			if (selectedEntry?.node.name === selectedOnCanvas) {
				return;
			}

			const entry = flatLogEntries.value.find((e) => e.node.name === selectedOnCanvas);

			manualLogEntrySelection.value = entry ? { type: 'selected', id: entry.id } : { type: 'none' };
		},
		{ immediate: true },
	);

	return { selected, select, selectPrev, selectNext };
}
