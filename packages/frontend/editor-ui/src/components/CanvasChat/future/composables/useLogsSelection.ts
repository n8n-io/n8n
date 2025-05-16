import type { LogEntrySelection } from '@/components/CanvasChat/types/logs';
import {
	findSelectedLogEntry,
	getDepth,
	getEntryAtRelativeIndex,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IExecutionResponse } from '@/Interface';
import { computed, ref, type ComputedRef } from 'vue';

export function useLogsSelection(
	execution: ComputedRef<IExecutionResponse | undefined>,
	tree: ComputedRef<LogEntry[]>,
	flatLogEntries: ComputedRef<LogEntry[]>,
) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = ref<LogEntrySelection>({ type: 'initial' });
	const selected = computed(() => findSelectedLogEntry(manualLogEntrySelection.value, tree.value));

	function select(value: LogEntry | undefined) {
		manualLogEntrySelection.value =
			value === undefined ? { type: 'none' } : { type: 'selected', id: value.id };

		if (value) {
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

		select(prevEntry);
	}

	function selectNext() {
		const entries = flatLogEntries.value;
		const nextEntry = selected.value
			? (getEntryAtRelativeIndex(entries, selected.value.id, 1) ?? entries[entries.length - 1])
			: entries[0];

		select(nextEntry);
	}

	return { selected, select, selectPrev, selectNext };
}
