import { watch, nextTick, type WatchStopHandle } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

const RUNNING_STATES = ['running', 'waiting'];

/**
 * Creates a one-shot watcher that fires when a workflow execution completes.
 * Returns a stop handle to cancel the watcher early (e.g., on component unmount).
 */
export function watchExecutionCompletion(onComplete: () => void | Promise<void>): WatchStopHandle {
	const workflowsStore = useWorkflowsStore();

	const stop = watch(
		() => workflowsStore.workflowExecutionData?.status,
		async (status) => {
			await nextTick();
			if (!status || RUNNING_STATES.includes(status)) return;
			stop();
			if (status !== 'canceled') {
				await onComplete();
			}
		},
	);

	return stop;
}
