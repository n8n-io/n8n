import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { isTerminalExecutionStatus } from 'n8n-workflow';
import { TRIMMED_RUN_DATA_FILL_DELAY } from '@/app/constants';
import {
	createExecutionDataId,
	hasExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { isEngineV2ExecutionId } from '@/features/execution/executions/executions.utils';

// Shared by every panel, so two panels on the same node send one request.
const fetchesInFlight = new Set<string>();

/**
 * Fills the output of the shown run when its push data is late or lost.
 *
 * Engine v2 sends a node's data in `nodeExecuteAfterData`. When that message
 * does not arrive (for example, it is too large for pubsub), the run stays
 * trimmed until the run ends. This composable waits for the message, then
 * fetches the execution once and copies the node's output into the live run.
 *
 * It runs only for the active, still-running engine v2 execution, and never
 * for a panel that shows another execution (a `workflowExecution` prop).
 */
export function useTrimmedRunDataFill(options: {
	nodeName: MaybeRefOrGetter<string | undefined>;
	runIndex: MaybeRefOrGetter<number>;
	isTrimmed: MaybeRefOrGetter<boolean>;
	hasWorkflowExecution: MaybeRefOrGetter<boolean>;
}) {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const workflowsStore = useWorkflowsStore();
	let delayTimeout: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Returns the execution to fill from, or `undefined` when no fill applies.
	 * Reads only `activeExecutionId`: `currentExecution` falls back to the
	 * displayed execution after the run ends.
	 */
	function getFillableExecutionId(): string | undefined {
		if (toValue(options.hasWorkflowExecution)) return undefined;

		const executionStateStore = workflowExecutionStateStore.value;
		const executionId = executionStateStore.activeExecutionId;
		if (typeof executionId !== 'string' || !isEngineV2ExecutionId(executionId)) return undefined;
		if (isTerminalExecutionStatus(executionStateStore.activeExecution?.status)) return undefined;

		return executionId;
	}

	function cancelDelay() {
		clearTimeout(delayTimeout);
		delayTimeout = undefined;
	}

	async function fill() {
		delayTimeout = undefined;

		const nodeName = toValue(options.nodeName);
		const executionId = getFillableExecutionId();
		if (!nodeName || !executionId || !toValue(options.isTrimmed)) return;

		const fetchKey = `${executionId}:${nodeName}`;
		if (fetchesInFlight.has(fetchKey)) return;
		fetchesInFlight.add(fetchKey);

		try {
			const execution = await workflowsStore.fetchExecutionDataById(executionId);
			const executionDataId = createExecutionDataId(executionId);
			// The store is gone when the user left the workflow during the request.
			if (!hasExecutionDataStore(executionDataId)) return;

			useExecutionDataStore(executionDataId).fillTrimmedNodeRunData(
				nodeName,
				execution?.data?.resultData.runData[nodeName],
			);
		} catch {
			// The refetch at the end of the run fills the data instead.
		} finally {
			fetchesInFlight.delete(fetchKey);
		}
	}

	watch(
		[
			() => toValue(options.nodeName),
			() => toValue(options.runIndex),
			() => toValue(options.isTrimmed),
		],
		() => {
			cancelDelay();
			if (toValue(options.isTrimmed) && getFillableExecutionId() !== undefined) {
				delayTimeout = setTimeout(() => {
					void fill();
				}, TRIMMED_RUN_DATA_FILL_DELAY);
			}
		},
		{ immediate: true },
	);

	onScopeDispose(cancelDelay);
}
