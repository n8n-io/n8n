import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/app/constants';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/app/event-bus';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import {
	SampleTemplates,
	isTutorialTemplateId,
} from '@/features/workflows/templates/utils/workflowSamples';
import {
	clearPopupWindowState,
	getExecutionErrorMessage,
	getExecutionErrorToastConfiguration,
} from '@/features/execution/executions/executions.utils';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import type { ExecutionFinished } from '@n8n/api-types/push/execution';
import { useI18n } from '@n8n/i18n';
import { parse } from 'flatted';
import type {
	ExecutionStatus,
	ExpressionError,
	IDataObject,
	IRunExecutionData,
	IWorkflowBase,
} from 'n8n-workflow';
import {
	EVALUATION_TRIGGER_NODE_TYPE,
	TelemetryHelpers,
	createRunExecutionData,
} from 'n8n-workflow';
import type { useRouter } from 'vue-router';
import { type WorkflowState } from '@/app/composables/useWorkflowState';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

export type SimplifiedExecution = Pick<
	IExecutionResponse,
	'workflowId' | 'workflowData' | 'data' | 'status' | 'startedAt' | 'stoppedAt' | 'id'
>;

export type ExecutionFinishedOptions = {
	router: ReturnType<typeof useRouter>;
	workflowState: WorkflowState;
};

/**
 * Handles the 'executionFinished' event, which happens when a workflow execution is finished.
 */
export async function executionFinished(
	{ data }: ExecutionFinished,
	options: ExecutionFinishedOptions,
) {
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();
	const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();
	const readyToRunStore = useReadyToRunStore();

	options.workflowState.executingNode.lastAddedExecutingNode = null;

	// No workflow is actively running, therefore we ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
		return;
	}

	const telemetry = useTelemetry();

	clearPopupWindowState();

	const workflow = workflowsListStore.getWorkflowById(data.workflowId);
	const templateId = workflow?.meta?.templateId;

	if (templateId) {
		const isEasyAIWorkflow = templateId === SampleTemplates.EasyAiTemplate;
		if (isEasyAIWorkflow) {
			telemetry.track('User executed test AI workflow', {
				status: data.status,
			});
		} else if (templateId.startsWith('035_template_onboarding')) {
			aiTemplatesStarterCollectionStore.trackUserExecutedWorkflow(
				templateId.split('-').pop() ?? '',
				data.status,
			);
		} else if (
			templateId === 'ready-to-run-ai-workflow' ||
			templateId === 'ready-to-run-ai-workflow-v5' ||
			templateId === 'ready-to-run-ai-workflow-v6'
		) {
			if (data.status === 'success') {
				readyToRunStore.trackExecuteAiWorkflowSuccess();
			} else {
				readyToRunStore.trackExecuteAiWorkflow(data.status);
			}
		} else if (isTutorialTemplateId(templateId)) {
			telemetry.track('User executed tutorial template', {
				template: templateId,
				status: data.status,
			});
		}
	}

	uiStore.setProcessingExecutionResults(true);

	let successToastAlreadyShown = false;

	if (data.status === 'success') {
		handleExecutionFinishedWithSuccessOrOther(
			options.workflowState,
			data.status,
			successToastAlreadyShown,
		);
		successToastAlreadyShown = true;
	}

	const execution = await fetchExecutionData(data.executionId);

	/**
	 * This accounts for the case where the execution is not stored.
	 * We clear the active execution id and set processing to false and return early.
	 * Returning early presists existing run data up to this point.
	 */
	if (!execution) {
		options.workflowState.setActiveExecutionId(undefined);
		uiStore.setProcessingExecutionResults(false);
		return;
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill(options);
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinishedWithSuccessOrOther(
			options.workflowState,
			execution.status,
			successToastAlreadyShown,
		);
	}

	setRunExecutionData(execution, runExecutionData, options.workflowState);

	continueEvaluationLoop(execution, options);
}

/**
 * Implicit looping: This will re-trigger the evaluation trigger if it exists on a successful execution of the workflow.
 * @param execution
 * @param router
 */
export function continueEvaluationLoop(
	execution: SimplifiedExecution,
	opts: ExecutionFinishedOptions,
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
		const { runWorkflow } = useRunWorkflow(opts);
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
	return createRunExecutionData({
		...execution.data,
		startData: execution.data?.startData,
		resultData: execution.data?.resultData ?? { runData: {} },
		executionData: execution.data?.executionData,
	});
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
	const workflowObject = workflowsStore.workflowObject;

	const workflowSettings = workflowsStore.workflowSettings;
	const saveManualExecutions =
		workflowSettings.saveManualExecutions ?? settingsStore.saveManualExecutions;

	if (!saveManualExecutions) {
		const uiStore = useUIStore();

		globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
			key: 'open-settings',
			action: async () => {
				if (!workflowsStore.isWorkflowSaved[workflowsStore.workflowId])
					await workflowSaving.saveAsNewWorkflow();
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			},
		});
	}

	// Workflow did start but had been put to wait
	useDocumentTitle().setDocumentTitle(workflowObject.name as string, 'IDLE');
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
	const documentTitle = useDocumentTitle();
	const workflowHelpers = useWorkflowHelpers();
	const workflowObject = workflowsStore.workflowObject;

	documentTitle.setDocumentTitle(workflowObject.name as string, 'ERROR');

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

		useBuilderStore().incrementManualExecutionStats('error');
	}
}

/**
 * Handle the case when the workflow execution finished successfully.
 *
 * On successful completion without data, we show a success toast
 * immediately, even though we still need to fetch and deserialize the
 * full execution data, to minimize perceived latency.
 */
function handleExecutionFinishedSuccessfully(
	workflowName: string,
	message: string,
	workflowState: WorkflowState,
) {
	const toast = useToast();

	useDocumentTitle().setDocumentTitle(workflowName, 'IDLE');
	workflowState.setActiveExecutionId(undefined);
	toast.showMessage({
		title: message,
		type: 'success',
	});
}

/**
 * Handle the case when the workflow execution finished successfully.
 */
export function handleExecutionFinishedWithSuccessOrOther(
	workflowState: WorkflowState,
	executionStatus: ExecutionStatus,
	successToastAlreadyShown: boolean,
) {
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();
	const workflowObject = workflowsStore.workflowObject;
	const workflowName = workflowObject.name ?? '';

	useDocumentTitle().setDocumentTitle(workflowName, 'IDLE');

	const workflowExecution = workflowsStore.getWorkflowExecution;
	if (workflowExecution?.executedNode) {
		const node = workflowsStore.getNodeByName(workflowExecution.executedNode);
		const nodeType = node && nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const nodeOutput =
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
		} else if (!successToastAlreadyShown) {
			handleExecutionFinishedSuccessfully(
				workflowName,
				i18n.baseText('pushConnection.nodeExecutedSuccessfully'),
				workflowState,
			);
		}
	} else if (!successToastAlreadyShown) {
		handleExecutionFinishedSuccessfully(
			workflowName,
			i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
			workflowState,
		);
	}

	// Execution finished is triggered multiple times
	// use "successToastAlreadyShown" flag to avoid double counting executions
	if (executionStatus === 'success' && !successToastAlreadyShown) {
		useBuilderStore().incrementManualExecutionStats('success');
	}
}

export function setRunExecutionData(
	execution: SimplifiedExecution,
	runExecutionData: IRunExecutionData,
	workflowState: WorkflowState,
) {
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers({ workflowState });
	const runDataExecutedErrorMessage = getRunDataExecutedErrorMessage(execution);
	const workflowExecution = workflowsStore.getWorkflowExecution;

	// @TODO(ckolb): Should this call `clearNodeExecutionQueue` instead?
	workflowState.executingNode.executingNode.length = 0;

	if (workflowExecution === null) {
		return;
	}

	workflowState.setWorkflowExecutionData({
		...workflowExecution,
		status: execution.status,
		id: execution.id,
		stoppedAt: execution.stoppedAt,
	});
	workflowsStore.setWorkflowExecutionRunData(runExecutionData);
	workflowState.setActiveExecutionId(undefined);

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

	workflowState.setActiveExecutionId(undefined);

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
