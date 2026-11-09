/**
 * Resolves whether the viewer may see a workflow tool's output data. The output
 * comes from the child workflow's execution, so it follows that workflow's
 * redaction settings: the executions API applies them for the current user.
 * The thread API still returns the raw output, so this only governs display.
 */
import { computed, ref, watch, type Ref } from 'vue';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { TimelineItem } from '../session-timeline.types';

export type WorkflowOutputAccess = 'none' | 'loading' | 'visible' | 'redacted' | 'unavailable';

export function useWorkflowOutputAccess(item: Ref<TimelineItem | null>) {
	const executionsStore = useExecutionsStore();
	const access = ref<WorkflowOutputAccess>('none');
	const resolved = new Map<string, 'visible' | 'redacted'>();

	const executionId = computed(() =>
		item.value?.kind === 'workflow' && item.value.workflowId
			? item.value.workflowExecutionId
			: undefined,
	);

	async function resolveAccess(id: string): Promise<'visible' | 'redacted' | 'unavailable'> {
		try {
			const execution = await executionsStore.fetchExecution(id);
			// A data-less or oversized execution has no redaction result. The empty
			// stub omits the signals that decide redaction, so show nothing.
			if (!execution?.data || execution.dataTooLargeToDisplay) return 'unavailable';
			const result = execution.data.redactionInfo?.isRedacted ? 'redacted' : 'visible';
			resolved.set(id, result);
			return result;
		} catch {
			return 'unavailable';
		}
	}

	watch(
		executionId,
		async (id) => {
			if (!id) {
				access.value = 'none';
				return;
			}
			const cached = resolved.get(id);
			if (cached) {
				access.value = cached;
				return;
			}
			access.value = 'loading';
			const result = await resolveAccess(id);
			if (executionId.value === id) access.value = result;
		},
		{ immediate: true },
	);

	return { access };
}
