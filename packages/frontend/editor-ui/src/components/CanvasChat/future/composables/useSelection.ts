import type { LogEntrySelection } from '@/components/CanvasChat/types/logs';
import {
	findSelectedLogEntry,
	getEntryAtRelativeIndex,
	type ExecutionLogViewData,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { computed, ref, type ComputedRef } from 'vue';

export function useSelection(
	execution: ComputedRef<ExecutionLogViewData | undefined>,
	flatLogEntries: ComputedRef<LogEntry[]>,
) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = ref<LogEntrySelection>({ type: 'initial' });
	const selected = computed(() =>
		findSelectedLogEntry(manualLogEntrySelection.value, execution.value),
	);

	function select(value: LogEntry | undefined) {
		const workflowId = execution.value?.workflowData.id;

		if (!workflowId) {
			return;
		}

		manualLogEntrySelection.value =
			value === undefined
				? { type: 'none', workflowId }
				: { type: 'selected', workflowId, data: value };

		if (value) {
			telemetry.track('User selected node in log view', {
				node_type: value.node.type,
				node_id: value.node.id,
				execution_id: execution.value?.id,
				workflow_id: execution.value?.workflowData.id,
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
