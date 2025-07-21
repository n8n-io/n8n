import type { ExecutionFinished } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/stores/ui.store';
import type { IExecutionResponse } from '@/Interface';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import {
	clearPopupWindowState,
	hasTrimmedData,
	hasTrimmedItem,
	getExecutionErrorToastConfiguration,
	getExecutionErrorMessage,
} from '@/utils/executionUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { parse } from 'flatted';
import { useToast } from '@/composables/useToast';
import type { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { TelemetryHelpers, EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IWorkflowBase, ExpressionError, IDataObject, IRunExecutionData } from 'n8n-workflow';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/event-bus';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';

export type SimplifiedExecution = Pick<
	IExecutionResponse,
	'workflowId' | 'workflowData' | 'data' | 'status' | 'startedAt' | 'stoppedAt' | 'id'
>;

/**
 * Handles the 'executionFinished' event, which happens when a workflow execution is finished.
 */
export async function executionFinished(
	{ data }: ExecutionFinished,
	options: { router: ReturnType<typeof useRouter> },
) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();

	workflowsStore.lastAddedExecutingNode = null;

	// No workflow is actively running, therefore we ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
		return;
	}

	const telemetry = useTelemetry();

	clearPopupWindowState();

	const workflow = workflowsStore.getWorkflowById(data.workflowId);
	if (workflow?.meta?.templateId) {
		const easyAiWorkflowJson = getEasyAiWorkflowJson();
		const isEasyAIWorkflow = workflow.meta.templateId === easyAiWorkflowJson.meta.templateId;
		if (isEasyAIWorkflow) {
			telemetry.track('User executed test AI workflow', {
				status: data.status,
			});
		}
		if (workflow.meta.templateId.startsWith('035_template_onboarding')) {
			aiTemplatesStarterCollectionStore.trackUserExecutedWorkflow(
				workflow.meta.templateId.split('-').pop() ?? '',
				data.status,
			);
		}
	}

	uiStore.setProcessingExecutionResults(true);

	let successToastAlreadyShown = false;
	let execution: SimplifiedExecution | undefined;
	if (data.rawData) {
		const { executionId, workflowId, status, rawData } = data;

		execution = {
			id: executionId,
			workflowId,
			workflowData: workflowsStore.workflow,
			data: parse(rawData),
			status,
			startedAt: workflowsStore.workflowExecutionData?.startedAt ?? new Date(),
			stoppedAt: new Date(),
		};
	} else {
		if (data.status === 'success') {
			handleExecutionFinishedSuccessfully(data.workflowId);
			successToastAlreadyShown = true;
		}

		execution = await fetchExecutionData(data.executionId);
		if (!execution) {
			uiStore.setProcessingExecutionResults(false);
			return;
		}
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill(options);
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinishedWithOther(successToastAlreadyShown);
	}

	setRunExecutionData(execution, runExecutionData);

	continueEvaluationLoop(execution, options.router);
}

/**
 * Implicit looping: This will re-trigger the evaluation trigger if it exists on a successful execution of the workflow.
 * @param execution
 * @param router
 */
export function continueEvaluationLoop(
	execution: SimplifiedExecution,
	router: ReturnType<typeof useRouter>,
) {
	if (execution.status !== 'success' || execution.data?.startData?.destinationNode !== undefined) {
		return;
	}

	// check if we have an evaluation trigger in our workflow and whether it has any run data
	const evaluationTrigger = execution.workflowData.nodes.find(
		(node) => node.type === EVALUATION_TRIGGER_NODE_TYPE,
	);
	const triggerRunData = evaluationTrigger
		? execution?.data?.resultData?.runData[evaluationTrigger.name]
		: undefined;

	if (!evaluationTrigger || triggerRunData === undefined) {
		return;
	}

	const mainData = triggerRunData[0]?.data?.main[0];
	const rowsLeft = mainData ? (mainData[0]?.json?._rowsLeft as number) : 0;

	if (rowsLeft && rowsLeft > 0) {
		const { runWorkflow } = useRunWorkflow({ router });
		void runWorkflow({
			triggerNode: evaluationTrigger.name,
			// pass output of previous node run to trigger next run
			nodeData: triggerRunData[0],
			rerunTriggerNode: true,
		});
	}
}

/**
 * Fetches the execution data from the server and returns a simplified execution object
 */
export async function fetchExecutionData(
	executionId: string,
): Promise<SimplifiedExecution | undefined> {
	const workflowsStore = useWorkflowsStore();
	try {
		const executionResponse = await workflowsStore.fetchExecutionDataById(executionId);
		if (!executionResponse?.data) {
			return;
		}

		return {
			id: executionId,
			workflowId: executionResponse.workflowId,
			workflowData: workflowsStore.workflow,
			data: parse(executionResponse.data as unknown as string),
			status: executionResponse.status,
			startedAt: workflowsStore.workflowExecutionData?.startedAt as Date,
			stoppedAt: new Date(),
		};
	} catch {
		return;
	}
}

/**
 * Returns the run execution data from the execution object in a normalized format
 */
export function getRunExecutionData(execution: SimplifiedExecution): IRunExecutionData {
	const workflowsStore = useWorkflowsStore();

	const runExecutionData: IRunExecutionData = {
		startData: execution.data?.startData,
		resultData: execution.data?.resultData ?? { runData: {} },
		executionData: execution.data?.executionData,
	};

	if (workflowsStore.workflowExecutionData?.workflowId === execution.workflowId) {
		const activeRunData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
		if (activeRunData) {
			for (const key of Object.keys(activeRunData)) {
				if (hasTrimmedItem(activeRunData[key])) continue;
				runExecutionData.resultData.runData[key] = activeRunData[key];
			}
		}
	}

	return runExecutionData;
}

/**
 * Returns the error message for the execution run data if the execution status is crashed or canceled,
 * or a fallback error message otherwise
 */
export function getRunDataExecutedErrorMessage(execution: SimplifiedExecution) {
	const i18n = useI18n();

	if (execution.status === 'crashed') {
		return i18n.baseText('pushConnection.executionFailed.message');
	} else if (execution.status === 'canceled') {
		const workflowsStore = useWorkflowsStore();

		return i18n.baseText('executionsList.showMessage.stopExecution.message', {
			interpolate: { activeExecutionId: workflowsStore.activeExecutionId ?? '' },
		});
	}

	return getExecutionErrorMessage({
		error: execution.data?.resultData.error,
		lastNodeExecuted: execution.data?.resultData.lastNodeExecuted,
	});
}

/**
 * Handle the case when the workflow execution finished with `waitTill`,
 * meaning that it's in a waiting state.
 */
export function handleExecutionFinishedWithWaitTill(options: {
	router: ReturnType<typeof useRouter>;
}) {
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const workflowSaving = useWorkflowSaving(options);
	const workflowHelpers = useWorkflowHelpers();
	const workflowObject = workflowsStore.getCurrentWorkflow();

	const workflowSettings = workflowsStore.workflowSettings;
	const saveManualExecutions =
		workflowSettings.saveManualExecutions ?? settingsStore.saveManualExecutions;

	if (!saveManualExecutions) {
		const uiStore = useUIStore();

		globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
			key: 'open-settings',
			action: async () => {
				if (workflowsStore.isNewWorkflow) await workflowSaving.saveAsNewWorkflow();
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			},
		});
	}

	// Workflow did start but had been put to wait
	workflowHelpers.setDocumentTitle(workflowObject.name as string, 'IDLE');
}

/**
 * Handle the case when the workflow execution finished with an `error` or `canceled` status.
 */
export function handleExecutionFinishedWithErrorOrCanceled(
	execution: SimplifiedExecution,
	runExecutionData: IRunExecutionData,
) {
	const toast = useToast();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers();
	const workflowObject = workflowsStore.getCurrentWorkflow();

	workflowHelpers.setDocumentTitle(workflowObject.name as string, 'ERROR');

	if (
		runExecutionData.resultData.error?.name === 'ExpressionError' &&
		(runExecutionData.resultData.error as ExpressionError).functionality === 'pairedItem'
	) {
		const error = runExecutionData.resultData.error as ExpressionError;

		void workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
			const eventData: IDataObject = {
				caused_by_credential: false,
				error_message: error.description,
				error_title: error.message,
				error_type: error.context.type,
				node_graph_string: JSON.stringify(
					TelemetryHelpers.generateNodesGraph(
						workflowData as IWorkflowBase,
						workflowHelpers.getNodeTypes(),
					).nodeGraph,
				),
				workflow_id: workflowsStore.workflowId,
			};

			if (
				error.context.nodeCause &&
				['paired_item_no_info', 'paired_item_invalid_info'].includes(error.context.type as string)
			) {
				const node = workflowObject.getNode(error.context.nodeCause as string);

				if (node) {
					eventData.is_pinned = !!workflowObject.getPinDataOfNode(node.name);
					eventData.mode = node.parameters.mode;
					eventData.node_type = node.type;
					eventData.operation = node.parameters.operation;
					eventData.resource = node.parameters.resource;
				}
			}

			telemetry.track('Instance FE emitted paired item error', eventData);
		});
	}

	if (execution.status === 'canceled') {
		// Do not show the error message if the workflow got canceled
		toast.showMessage({
			title: i18n.baseText('nodeView.showMessage.stopExecutionTry.title'),
			type: 'success',
		});
	} else if (execution.data?.resultData.error) {
		const { message, title } = getExecutionErrorToastConfiguration({
			error: execution.data.resultData.error,
			lastNodeExecuted: execution.data?.resultData.lastNodeExecuted,
		});

		toast.showMessage({ title, message, type: 'error', duration: 0 });
	}
}

/**
 * Handle the case when the workflow execution finished successfully.
 *
 * On successful completion without data, we show a success toast
 * immediately, even though we still need to fetch and deserialize the
 * full execution data, to minimize perceived latency.
 */
export function handleExecutionFinishedSuccessfully(workflowId: string) {
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers();
	const toast = useToast();
	const i18n = useI18n();

	workflowHelpers.setDocumentTitle(workflowsStore.getWorkflowById(workflowId)?.name, 'IDLE');
	workflowsStore.setActiveExecutionId(undefined);
	toast.showMessage({
		title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
		type: 'success',
	});
}

/**
 * Handle the case when the workflow execution finished successfully.
 */
export function handleExecutionFinishedWithOther(successToastAlreadyShown: boolean) {
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const i18n = useI18n();
	const workflowHelpers = useWorkflowHelpers();
	const nodeTypesStore = useNodeTypesStore();
	const workflowObject = workflowsStore.getCurrentWorkflow();

	workflowHelpers.setDocumentTitle(workflowObject.name as string, 'IDLE');

	const workflowExecution = workflowsStore.getWorkflowExecution;
	if (workflowExecution?.executedNode) {
		const node = workflowsStore.getNodeByName(workflowExecution.executedNode);
		const nodeType = node && nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const nodeOutput =
			workflowExecution?.executedNode &&
			workflowExecution.data?.resultData?.runData?.[workflowExecution.executedNode];
		if (nodeType?.polling && !nodeOutput) {
			toast.showMessage({
				title: i18n.baseText('pushConnection.pollingNode.dataNotFound', {
					interpolate: {
						service: getTriggerNodeServiceName(nodeType),
					},
				}),
				message: i18n.baseText('pushConnection.pollingNode.dataNotFound.message', {
					interpolate: {
						service: getTriggerNodeServiceName(nodeType),
					},
				}),
				type: 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText('pushConnection.nodeExecutedSuccessfully'),
				type: 'success',
			});
		}
	} else if (!successToastAlreadyShown) {
		toast.showMessage({
			title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
			type: 'success',
		});
	}
}

export function setRunExecutionData(
	execution: SimplifiedExecution,
	runExecutionData: IRunExecutionData,
) {
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers();
	const runDataExecutedErrorMessage = getRunDataExecutedErrorMessage(execution);
	const workflowExecution = workflowsStore.getWorkflowExecution;

	// It does not push the runData as it got already pushed with each
	// node that did finish. For that reason copy in here the data
	// which we already have. But if the run data in the store is trimmed,
	// we skip copying so we use the full data from the final message.
	if (workflowsStore.getWorkflowRunData && !hasTrimmedData(workflowsStore.getWorkflowRunData)) {
		runExecutionData.resultData.runData = workflowsStore.getWorkflowRunData;
	}

	workflowsStore.executingNode.length = 0;

	workflowsStore.setWorkflowExecutionData({
		...workflowExecution,
		status: execution.status,
		id: execution.id,
		stoppedAt: execution.stoppedAt,
	} as IExecutionResponse);
	workflowsStore.setWorkflowExecutionRunData(runExecutionData);
	workflowsStore.setActiveExecutionId(undefined);

	// Set the node execution issues on all the nodes which produced an error so that
	// it can be displayed in the node-view
	nodeHelpers.updateNodesExecutionIssues();

	const lastNodeExecuted: string | undefined = runExecutionData.resultData.lastNodeExecuted;
	let itemsCount = 0;
	if (
		lastNodeExecuted &&
		runExecutionData.resultData.runData[lastNodeExecuted] &&
		!runDataExecutedErrorMessage
	) {
		itemsCount =
			runExecutionData.resultData.runData[lastNodeExecuted][0].data?.main[0]?.length ?? 0;
	}

	workflowsStore.setActiveExecutionId(undefined);

	void useExternalHooks().run('pushConnection.executionFinished', {
		itemsCount,
		nodeName: runExecutionData.resultData.lastNodeExecuted,
		errorMessage: runDataExecutedErrorMessage,
		runDataExecutedStartData: runExecutionData.startData,
		resultDataError: runExecutionData.resultData.error,
	});

	const lineNumber = runExecutionData.resultData?.error?.lineNumber;
	codeNodeEditorEventBus.emit('highlightLine', lineNumber ?? 'last');
}
