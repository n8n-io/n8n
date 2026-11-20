import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { injectStrict } from '@/app/utils/injectStrict';

const START_TIMEOUT_MS = 5000;

export type FirstWorkflowTestStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Runs the workflow of the surrounding canvas host once and reports the outcome.
 * A read-only canvas has no Run button, so the flow offers its own.
 * Call it inside the canvas host, which provides the workflow document.
 */
export function useFirstWorkflowTest(onFinished?: (succeeded: boolean, message?: string) => void) {
	const workflowDocumentStore = injectStrict(WorkflowDocumentStoreKey);
	const { runEntireWorkflow } = useRunWorkflow({ router: useRouter() });

	const status = ref<FirstWorkflowTestStatus>('idle');
	const errorMessage = ref<string>();

	const executionState = useWorkflowExecutionStateStore(
		createWorkflowDocumentId(workflowDocumentStore.value.workflowId),
	);

	function readOutcome(executionId: string | null | undefined) {
		if (!executionId) return { succeeded: false };

		const runData = useExecutionDataStore(createExecutionDataId(executionId)).executionRunData;
		for (const tasks of Object.values(runData ?? {})) {
			const error = tasks?.at(-1)?.error;
			if (error) return { succeeded: false, message: error.message };
		}
		return { succeeded: true };
	}

	// A run ends when its execution id clears. It can clear from a string id, or from `null` when the
	// run stops before it starts, for example when a node has no credential.
	watch(
		() => executionState.activeExecutionId,
		(id, previousId) => {
			if (status.value !== 'running' || id !== undefined || previousId === undefined) return;

			const executionId =
				executionState.displayedExecutionId ??
				(typeof previousId === 'string' ? previousId : undefined);
			const { succeeded, message } = readOutcome(executionId);
			status.value = succeeded ? 'success' : 'error';
			errorMessage.value = message;
			onFinished?.(succeeded, message);
		},
	);

	async function test() {
		if (status.value === 'running') return;

		status.value = 'running';
		errorMessage.value = undefined;
		await runEntireWorkflow('main');

		// A run that fails validation never starts, so no execution id shows up to end it.
		await new Promise((resolve) => setTimeout(resolve, START_TIMEOUT_MS));
		if (status.value === 'running' && executionState.activeExecutionId === undefined) {
			status.value = 'error';
			onFinished?.(false);
		}
	}

	return { status, errorMessage, test };
}
