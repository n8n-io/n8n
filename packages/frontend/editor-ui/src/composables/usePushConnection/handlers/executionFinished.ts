import type { ExecutionFinished } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/stores/ui.store';
import type { IExecutionResponse } from '@/Interface';
import { AI_CREDITS_EXPERIMENT, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import { clearPopupWindowState, hasTrimmedData, hasTrimmedItem } from '@/utils/executionUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { usePostHog } from '@/stores/posthog.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { parse } from 'flatted';
import { useToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { TelemetryHelpers } from 'n8n-workflow';
import type {
	IWorkflowBase,
	NodeError,
	NodeOperationError,
	SubworkflowOperationError,
	ExpressionError,
	IDataObject,
	IRunExecutionData,
} from 'n8n-workflow';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/event-bus';
import { h } from 'vue';
import NodeExecutionErrorMessage from '@/components/NodeExecutionErrorMessage.vue';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export type SimplifiedExecution = Pick<
	IExecutionResponse,
	'workflowId' | 'data' | 'status' | 'startedAt' | 'stoppedAt'
>;

export async function executionFinished({ data }: ExecutionFinished) {
	const uiStore = useUIStore();

	if (!uiStore.isActionActive.workflowRunning) {
		// No workflow is running so ignore the messages
		return false;
	}

	const workflowsStore = useWorkflowsStore();
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();

	clearPopupWindowState();

	const workflow = workflowsStore.getWorkflowById(data.workflowId);
	if (workflow?.meta?.templateId) {
		const isAiCreditsExperimentEnabled =
			posthogStore.getVariant(AI_CREDITS_EXPERIMENT.name) === AI_CREDITS_EXPERIMENT.variant;
		const easyAiWorkflowJson = getEasyAiWorkflowJson({
			isInstanceInAiFreeCreditsExperiment: isAiCreditsExperimentEnabled,
			withOpenAiFreeCredits: settingsStore.aiCreditsQuota,
		});
		const isEasyAIWorkflow = workflow.meta.templateId === easyAiWorkflowJson.meta.templateId;
		if (isEasyAIWorkflow) {
			telemetry.track(
				'User executed test AI workflow',
				{
					status: data.status,
				},
				{ withPostHog: true },
			);
		}
	}

	uiStore.setProcessingExecutionResults(true);

	let successToastAlreadyShown = false;
	let execution: SimplifiedExecution;
	if (data.rawData) {
		const { workflowId, status, rawData } = data;

		execution = {
			workflowId,
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

		execution = await getExecutionData(data.executionId);
		if (!execution) {
			uiStore.setProcessingExecutionResults(false);
			return false;
		}
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill();
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinished(execution, runExecutionData, successToastAlreadyShown);
	}

	const lineNumber = runExecutionData.resultData?.error?.lineNumber;
	codeNodeEditorEventBus.emit('highlightLine', lineNumber ?? 'last');
}

export async function getExecutionData(executionId: string) {
	const workflowsStore = useWorkflowsStore();
	try {
		const executionResponse = await workflowsStore.fetchExecutionDataById(executionId);
		if (!executionResponse?.data) {
			return false;
		}

		return {
			workflowId: executionResponse.workflowId,
			data: parse(executionResponse.data as unknown as string),
			status: executionResponse.status,
			startedAt: workflowsStore.workflowExecutionData?.startedAt as Date,
			stoppedAt: new Date(),
		};
	} catch {
		return false;
	}
}

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

export function getExecutionError(execution: SimplifiedExecution): string {
	const error = execution.data?.resultData.error;
	const i18n = useI18n();

	let errorMessage: string;

	if (execution.data?.resultData.lastNodeExecuted && error) {
		errorMessage = error.message ?? error.description ?? '';
	} else {
		errorMessage = i18n.baseText('pushConnection.executionError', {
			interpolate: { error: '!' },
		});

		if (error?.message) {
			let nodeName: string | undefined;
			if ('node' in error) {
				nodeName = typeof error.node === 'string' ? error.node : error.node!.name;
			}

			const receivedError = nodeName ? `${nodeName}: ${error.message}` : error.message;
			errorMessage = i18n.baseText('pushConnection.executionError', {
				interpolate: {
					error: `.${i18n.baseText('pushConnection.executionError.details', {
						interpolate: {
							details: receivedError,
						},
					})}`,
				},
			});
		}
	}

	return errorMessage;
}

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

	return getExecutionError(execution);
}

/**
 * Handle the case when the workflow execution finished with waitTill, meaning that it's in a waiting state.
 */
export function handleExecutionFinishedWithWaitTill() {
	const router = useRouter();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const workflowHelpers = useWorkflowHelpers({ router });
	const workflowObject = workflowsStore.getCurrentWorkflow();

	const workflowSettings = workflowsStore.workflowSettings;
	const saveManualExecutions =
		workflowSettings.saveManualExecutions ?? settingsStore.saveManualExecutions;

	if (!saveManualExecutions) {
		const uiStore = useUIStore();

		globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
			key: 'open-settings',
			action: async () => {
				if (workflowsStore.isNewWorkflow) await workflowHelpers.saveAsNewWorkflow();
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			},
		});
	}

	// Workflow did start but had been put to wait
	workflowHelpers.setDocumentTitle(workflowObject.name as string, 'IDLE');
}

/**
 * Handle the case when the workflow execution finished with error or canceled.
 */
export function handleExecutionFinishedWithErrorOrCanceled(
	execution: SimplifiedExecution,
	runExecutionData: IRunExecutionData,
) {
	const toast = useToast();
	const router = useRouter();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers({ router });
	const workflowObject = workflowsStore.getCurrentWorkflow();
	const runDataExecutedErrorMessage = getRunDataExecutedErrorMessage(execution);

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

			telemetry.track('Instance FE emitted paired item error', eventData, {
				withPostHog: true,
			});
		});
	}

	if (runExecutionData.resultData.error?.name === 'SubworkflowOperationError') {
		const error = runExecutionData.resultData.error as SubworkflowOperationError;

		workflowsStore.subWorkflowExecutionError = error;

		toast.showMessage({
			title: error.message,
			message: error.description,
			type: 'error',
			duration: 0,
		});
	} else if (
		(runExecutionData.resultData.error?.name === 'NodeOperationError' ||
			runExecutionData.resultData.error?.name === 'NodeApiError') &&
		(runExecutionData.resultData.error as NodeError).functionality === 'configuration-node'
	) {
		// If the error is a configuration error of the node itself doesn't get executed so we can't use lastNodeExecuted for the title
		let title: string;
		const nodeError = runExecutionData.resultData.error as NodeOperationError;
		if (nodeError.node.name) {
			title = `Error in sub-node ‘${nodeError.node.name}‘`;
		} else {
			title = 'Problem executing workflow';
		}

		toast.showMessage({
			title,
			message: h(NodeExecutionErrorMessage, {
				errorMessage: nodeError?.description ?? runDataExecutedErrorMessage,
				nodeName: nodeError.node.name,
			}),
			type: 'error',
			duration: 0,
		});
	} else {
		// Do not show the error message if the workflow got canceled
		if (execution.status === 'canceled') {
			toast.showMessage({
				title: i18n.baseText('nodeView.showMessage.stopExecutionTry.title'),
				type: 'success',
			});
		} else {
			let title: string;
			if (runExecutionData.resultData.lastNodeExecuted) {
				title = `Problem in node ‘${runExecutionData.resultData.lastNodeExecuted}‘`;
			} else {
				title = 'Problem executing workflow';
			}

			toast.showMessage({
				title,
				message: runDataExecutedErrorMessage,
				type: 'error',
				duration: 0,
			});
		}
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
	const router = useRouter();
	const workflowsStore = useWorkflowsStore();
	const workflowHelpers = useWorkflowHelpers({ router });
	const uiStore = useUIStore();
	const toast = useToast();

	workflowHelpers.setDocumentTitle(workflowsStore.getWorkflowById(workflowId)?.name, 'IDLE');
	uiStore.removeActiveAction('workflowRunning');
	toast.showMessage({
		title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
		type: 'success',
	});
}

/**
 * Handle the case when the workflow execution finished successfully.
 */
export function handleExecutionFinished(
	execution: SimplifiedExecution,
	runExecutionData: IRunExecutionData,
	successToastAlreadyShown: boolean = false,
) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const toast = useToast();
	const i18n = useI18n();
	const router = useRouter();
	const workflowHelpers = useWorkflowHelpers({ router });
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const workflowObject = workflowsStore.getCurrentWorkflow();
	const runDataExecutedErrorMessage = getRunDataExecutedErrorMessage(execution);

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

	// It does not push the runData as it got already pushed with each
	// node that did finish. For that reason copy in here the data
	// which we already have. But if the run data in the store is trimmed,
	// we skip copying so we use the full data from the final message.
	if (workflowsStore.getWorkflowRunData && !hasTrimmedData(workflowsStore.getWorkflowRunData)) {
		runExecutionData.resultData.runData = workflowsStore.getWorkflowRunData;
	}

	workflowsStore.executingNode.length = 0;
	workflowsStore.setWorkflowExecutionData(workflowExecution as IExecutionResponse);
	uiStore.removeActiveAction('workflowRunning');

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
		itemsCount = runExecutionData.resultData.runData[lastNodeExecuted][0].data.main[0].length;
	}

	workflowsStore.setActiveExecutionId(null);

	void useExternalHooks().run('pushConnection.executionFinished', {
		itemsCount,
		nodeName: runExecutionData.resultData.lastNodeExecuted,
		errorMessage: runDataExecutedErrorMessage,
		runDataExecutedStartData: runExecutionData.startData,
		resultDataError: runExecutionData.resultData.error,
	});
}
