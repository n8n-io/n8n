import { onBeforeUnmount, shallowRef, watch } from 'vue';
import type { IPinData } from 'n8n-workflow';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ExecutionResult } from '../canvasPreview.utils';

interface UseInstanceAiWorkflowPreviewExecutionOptions {
	workflowId: () => string;
	executionResult: () => ExecutionResult | undefined;
	reportWorkflowFailures: (executionId: string, workflowId: string) => void;
}

function hasPinData(pinData: IPinData | undefined): pinData is IPinData {
	return pinData !== undefined && Object.keys(pinData).length > 0;
}

function normalizeExecutionPinData(execution: IExecutionResponse): IExecutionResponse {
	const data = execution.data;
	const resultData = data?.resultData;
	const workflowPinData = execution.workflowData.pinData;
	if (!data || !resultData || !hasPinData(workflowPinData) || hasPinData(resultData.pinData)) {
		return execution;
	}

	return {
		...execution,
		data: {
			...data,
			resultData: {
				...resultData,
				pinData: workflowPinData,
			},
		},
	};
}

export function useInstanceAiWorkflowPreviewExecution(
	options: UseInstanceAiWorkflowPreviewExecutionOptions,
) {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const latestAgentExecution = shallowRef<IExecutionResponse>();
	const supersededAgentExecutionId = shallowRef<string | null>(null);
	let latestExecutionLoadRequest = 0;

	function applyAgentExecution(execution: IExecutionResponse): boolean {
		const workflowId = options.workflowId();
		if (execution.workflowId !== workflowId) return false;

		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		const activeExecutionId = executionState.activeExecutionId;

		if (activeExecutionId === null) return false;
		if (typeof activeExecutionId === 'string' && activeExecutionId !== execution.id) return false;

		executionState.setWorkflowExecutionData(normalizeExecutionPinData(execution));

		return true;
	}

	function restoreLatestAgentExecution() {
		const execution = latestAgentExecution.value;
		if (!execution) return;
		if (supersededAgentExecutionId.value === execution.id) return;
		applyAgentExecution(execution);
	}

	async function showExecutionResult(executionResult: ExecutionResult | undefined) {
		if (!executionResult) return;
		if (supersededAgentExecutionId.value === executionResult.executionId) return;

		if (latestAgentExecution.value?.id === executionResult.executionId) {
			applyAgentExecution(latestAgentExecution.value);
			return;
		}

		const request = ++latestExecutionLoadRequest;
		let execution: IExecutionResponse | null | undefined;
		try {
			execution = await workflowsStore.fetchExecutionDataById(executionResult.executionId);
		} catch {
			return;
		}
		if (request !== latestExecutionLoadRequest) return;
		if (!execution || execution.workflowId !== options.workflowId()) return;

		latestAgentExecution.value = normalizeExecutionPinData(execution);
		if (supersededAgentExecutionId.value !== execution.id) {
			applyAgentExecution(latestAgentExecution.value);
		}
	}

	function restoreExecutionResult() {
		void showExecutionResult(options.executionResult());
	}

	// Runs before the global executionStarted handler, so Instance AI executions
	// can reset active state without letting stale agent results override user runs.
	const removeExecutionStartedListener = pushStore.addEventListener((event) => {
		if (event.type !== 'executionStarted') return;
		if (event.data.workflowId !== options.workflowId()) return;
		const executionState = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(options.workflowId()),
		);
		if (event.data.source !== 'instance_ai') {
			supersededAgentExecutionId.value = options.executionResult()?.executionId ?? null;
			return;
		}
		if (
			typeof executionState.activeExecutionId === 'string' &&
			executionState.activeExecutionId !== event.data.executionId
		) {
			return;
		}
		executionState.setActiveExecutionId(null);
	});

	const removeExecutionFinishedListener = pushStore.addEventListener((event) => {
		if (event.type !== 'executionFinished') return;
		if (event.data.workflowId !== options.workflowId()) return;
		if (event.data.status !== 'error' && event.data.status !== 'crashed') return;
		if (event.data.source === 'instance_ai') return;
		options.reportWorkflowFailures(event.data.executionId, event.data.workflowId);
	});

	watch(
		() => [options.workflowId(), options.executionResult()?.executionId] as const,
		() => {
			void showExecutionResult(options.executionResult());
		},
		{ immediate: true },
	);

	watch(
		() => {
			const workflowId = options.workflowId();
			return [
				workflowId,
				useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId)).activeExecutionId,
			] as const;
		},
		() => {
			restoreLatestAgentExecution();
		},
	);

	onBeforeUnmount(() => {
		removeExecutionStartedListener();
		removeExecutionFinishedListener();
	});

	return {
		restoreExecutionResult,
	};
}
