import { onBeforeUnmount, shallowRef, watch } from 'vue';
import type { IPinData } from 'n8n-workflow';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useAiSimulatedExecutionsStore } from '@/app/stores/aiSimulatedExecutions.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { ExecutionResult } from '../canvasPreview.utils';
import { useThread } from '../instanceAi.store';

interface UseInstanceAiWorkflowPreviewExecutionOptions {
	workflowId: () => string;
	executionResult: () => ExecutionResult | undefined;
	reportWorkflowFailures: (executionId: string, workflowId: string) => void;
	/** Pane the artifact renders in. Its size gates the logs panel auto-open. */
	paneElement: () => HTMLElement | null;
}

// Below this pane size an open logs panel hides most of the canvas (INS-1192).
const LOGS_AUTO_OPEN_MIN_PANE_WIDTH = 650;
const LOGS_AUTO_OPEN_MIN_PANE_HEIGHT = 600;

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
	const logsStore = useLogsStore();
	const aiSimulatedExecutionsStore = useAiSimulatedExecutionsStore();
	// Thread runtime owns the user-run memory so it survives the preview unmounting
	// on a tab switch and is reachable here without prop-drilling (INS-611).
	const thread = useThread();
	const telemetry = useTelemetry();
	const latestAgentExecution = shallowRef<IExecutionResponse>();
	const supersededAgentExecutionId = shallowRef<string | null>(null);
	let latestExecutionLoadRequest = 0;

	// True while this composable toggles the panel, so the watcher below can tell
	// its own toggles from the user's.
	let isTogglingLogsAutomatically = false;
	// The thread runtime keeps the auto-open bookkeeping because this composable
	// is recreated on every tab switch.
	const logsPanelMemory = thread.logsPanelMemory;

	function isPaneLargeEnoughForLogs(): boolean {
		const rect = options.paneElement()?.getBoundingClientRect();
		return (
			rect !== undefined &&
			rect.width >= LOGS_AUTO_OPEN_MIN_PANE_WIDTH &&
			rect.height >= LOGS_AUTO_OPEN_MIN_PANE_HEIGHT
		);
	}

	// A preview behind another artifact tab stays mounted but hidden. Runs of a
	// tab the user does not see leave the panel as it is.
	function isPaneVisible(): boolean {
		const pane = options.paneElement();
		return pane !== null && getComputedStyle(pane).visibility !== 'hidden';
	}

	function toggleLogsAutomatically(open: boolean) {
		isTogglingLogsAutomatically = true;
		logsStore.toggleOpen(open);
		isTogglingLogsAutomatically = false;
		logsPanelMemory.autoOpened = open;
		telemetry.track('User toggled log view', {
			new_state: open ? 'attached' : 'collapsed',
			source: 'auto',
			context: 'artifact',
		});
	}

	// Users rarely discover the logs panel on their own, so open it when a run
	// (user- or agent-made) starts for this artifact's workflow (INS-860). Skip
	// it when the user collapsed the panel in this thread or the pane is small.
	function openLogsForRun(executionId: string) {
		if (!isPaneVisible()) return;
		logsPanelMemory.latestStartedExecutionIds.set(options.workflowId(), executionId);
		if (logsStore.isOpen || logsPanelMemory.collapsedByUser) return;
		if (!isPaneLargeEnoughForLogs()) return;
		toggleLogsAutomatically(true);
	}

	// A successful run collapses the panel that opened automatically. A failed run
	// keeps it open, and the logs panel selects the failing node by itself.
	function collapseLogsAfterRun(executionId: string) {
		if (!isPaneVisible()) return;
		if (executionId !== logsPanelMemory.latestStartedExecutionIds.get(options.workflowId())) {
			return;
		}
		if (!logsPanelMemory.autoOpened || !logsStore.isOpen) return;
		toggleLogsAutomatically(false);
	}

	// A toggle this composable did not make is the user's. A collapse stops the
	// auto-open for the rest of the thread. Any user toggle stops the auto-collapse.
	watch(
		() => logsStore.isOpen,
		(isOpen) => {
			if (isTogglingLogsAutomatically) return;
			logsPanelMemory.autoOpened = false;
			if (!isOpen) logsPanelMemory.collapsedByUser = true;
		},
		{ flush: 'sync' },
	);

	function applyExecution(execution: IExecutionResponse): boolean {
		const workflowId = options.workflowId();
		if (execution.workflowId !== workflowId) return false;

		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		const activeExecutionId = executionState.activeExecutionId;

		if (activeExecutionId === null) return false;
		if (typeof activeExecutionId === 'string' && activeExecutionId !== execution.id) return false;

		executionState.setWorkflowExecutionData(normalizeExecutionPinData(execution));

		return true;
	}

	function hasManualExecution() {
		return thread.getRememberedManualExecution(options.workflowId()) !== undefined;
	}

	async function fetchPreviewExecution(
		executionId: string,
	): Promise<IExecutionResponse | undefined> {
		const request = ++latestExecutionLoadRequest;
		let execution: IExecutionResponse | null | undefined;
		try {
			execution = await workflowsStore.fetchExecutionDataById(executionId);
		} catch {
			return;
		}
		if (request !== latestExecutionLoadRequest) return;
		if (!execution || execution.workflowId !== options.workflowId()) return;
		return normalizeExecutionPinData(execution);
	}

	function restoreLatestAgentExecution() {
		if (hasManualExecution()) return;
		const execution = latestAgentExecution.value;
		if (!execution) return;
		if (supersededAgentExecutionId.value === execution.id) return;
		applyExecution(execution);
	}

	async function showExecutionResult(executionResult: ExecutionResult | undefined) {
		if (!executionResult) return;
		// Record which node outputs of this agent execution are fabricated
		// fixtures, so the NDV can label them and guard the pin affordance.
		if (executionResult.simulatedNodeNames?.length) {
			aiSimulatedExecutionsStore.markSimulatedNodes(
				executionResult.executionId,
				executionResult.simulatedNodeNames,
			);
		}
		if (hasManualExecution()) return;
		if (supersededAgentExecutionId.value === executionResult.executionId) return;

		if (latestAgentExecution.value?.id === executionResult.executionId) {
			applyExecution(latestAgentExecution.value);
			return;
		}

		const execution = await fetchPreviewExecution(executionResult.executionId);
		if (!execution) return;

		latestAgentExecution.value = execution;
		if (supersededAgentExecutionId.value !== execution.id) {
			applyExecution(execution);
		}
	}

	async function restoreManualExecution(executionId: string) {
		const execution = await fetchPreviewExecution(executionId);
		if (execution) applyExecution(execution);
	}

	function restoreExecutionResult() {
		const manual = thread.getRememberedManualExecution(options.workflowId());
		// User run wins unless the agent ran again since (different current agentExecutionId).
		if (manual && options.executionResult()?.executionId === manual.agentExecutionId) {
			void restoreManualExecution(manual.executionId);
			return;
		}
		if (manual) thread.forgetManualExecution(options.workflowId());
		void showExecutionResult(options.executionResult());
	}

	// Runs before the global executionStarted handler, so Instance AI executions
	// can reset active state without letting stale agent results override user runs.
	const removeExecutionStartedListener = pushStore.addEventListener((event) => {
		if (event.type !== 'executionStarted') return;
		if (event.data.workflowId !== options.workflowId()) return;
		openLogsForRun(event.data.executionId);
		const executionState = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(options.workflowId()),
		);
		if (event.data.source !== 'instance_ai') {
			// Remember the user run so a tab switch can re-seed it.
			thread.rememberManualExecution(
				options.workflowId(),
				event.data.executionId,
				options.executionResult()?.executionId,
			);
			supersededAgentExecutionId.value = options.executionResult()?.executionId ?? null;
			return;
		}
		// A fresh agent run supersedes any remembered user run.
		thread.forgetManualExecution(options.workflowId());
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
		if (event.data.status === 'success') {
			collapseLogsAfterRun(event.data.executionId);
			return;
		}
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
