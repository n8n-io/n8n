import { parse } from 'flatted';
import { h, ref } from 'vue';
import type { useRouter } from 'vue-router';
import { TelemetryHelpers } from 'n8n-workflow';
import type {
	ExpressionError,
	IDataObject,
	INodeTypeNameVersion,
	IRunExecutionData,
	IWorkflowBase,
	SubworkflowOperationError,
	IExecuteContextData,
	NodeOperationError,
	INodeTypeDescription,
	NodeError,
} from 'n8n-workflow';
import type { PushMessage } from '@n8n/api-types';

import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/event-bus';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { PushMessageQueueItem } from '@/types';
import { useAssistantStore } from '@/stores/assistant.store';
import NodeExecutionErrorMessage from '@/components/NodeExecutionErrorMessage.vue';
import type { IExecutionResponse } from '@/Interface';
import { clearPopupWindowState, hasTrimmedData, hasTrimmedItem } from '../utils/executionUtils';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';

export function usePushConnection({ router }: { router: ReturnType<typeof useRouter> }) {
	const workflowHelpers = useWorkflowHelpers({ router });
	const nodeHelpers = useNodeHelpers();
	const toast = useToast();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const orchestrationManagerStore = useOrchestrationStore();
	const pushStore = usePushConnectionStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const assistantStore = useAssistantStore();

	const retryTimeout = ref<NodeJS.Timeout | null>(null);
	const pushMessageQueue = ref<PushMessageQueueItem[]>([]);
	const removeEventListener = ref<(() => void) | null>(null);

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((message) => {
			void pushMessageReceived(message);
		});
	}

	function terminate() {
		if (typeof removeEventListener.value === 'function') {
			removeEventListener.value();
		}
	}

	/**
	 * Sometimes the push message is faster as the result from
	 * the REST API so we do not know yet what execution ID
	 * is currently active. So internally resend the message
	 * a few more times
	 */
	function queuePushMessage(event: PushMessage, retryAttempts: number) {
		pushMessageQueue.value.push({ message: event, retriesLeft: retryAttempts });

		if (retryTimeout.value === null) {
			retryTimeout.value = setTimeout(processWaitingPushMessages, 20);
		}
	}

	/**
	 * Process the push messages which are waiting in the queue
	 */
	async function processWaitingPushMessages() {
		if (retryTimeout.value !== null) {
			clearTimeout(retryTimeout.value);
			retryTimeout.value = null;
		}

		const queueLength = pushMessageQueue.value.length;
		for (let i = 0; i < queueLength; i++) {
			const messageData = pushMessageQueue.value.shift() as PushMessageQueueItem;

			const result = await pushMessageReceived(messageData.message, true);
			if (!result) {
				// Was not successful
				messageData.retriesLeft -= 1;

				if (messageData.retriesLeft > 0) {
					// If still retries are left add it back and stop execution
					pushMessageQueue.value.unshift(messageData);
				}
				break;
			}
		}

		if (pushMessageQueue.value.length !== 0 && retryTimeout.value === null) {
			retryTimeout.value = setTimeout(processWaitingPushMessages, 25);
		}
	}

	/**
	 * Process a newly received message
	 */
	async function pushMessageReceived(
		receivedData: PushMessage,
		isRetry?: boolean,
	): Promise<boolean> {
		const retryAttempts = 5;

		if (receivedData.type === 'sendWorkerStatusMessage') {
			const pushData = receivedData.data;
			orchestrationManagerStore.updateWorkerStatus(pushData.status);
			return true;
		}

		if (receivedData.type === 'sendConsoleMessage') {
			const pushData = receivedData.data;
			console.log(pushData.source, ...pushData.messages);
			return true;
		}

		if (
			!['testWebhookReceived'].includes(receivedData.type) &&
			isRetry !== true &&
			pushMessageQueue.value.length
		) {
			// If there are already messages in the queue add the new one that all of them
			// get executed in order
			queuePushMessage(receivedData, retryAttempts);
			return false;
		}

		if (receivedData.type === 'executionStarted') {
			if (!workflowsStore.activeExecutionId) {
				workflowsStore.setActiveExecutionId(receivedData.data.executionId);
			}
		}

		if (
			receivedData.type === 'nodeExecuteAfter' ||
			receivedData.type === 'nodeExecuteBefore' ||
			receivedData.type === 'executionStarted'
		) {
			if (!uiStore.isActionActive.workflowRunning) {
				// No workflow is running so ignore the messages
				return false;
			}
			const pushData = receivedData.data;
			if (workflowsStore.activeExecutionId !== pushData.executionId) {
				// The data is not for the currently active execution or
				// we do not have the execution id yet.
				if (isRetry !== true) {
					queuePushMessage(receivedData, retryAttempts);
				}
				return false;
			}
		}

		if (
			receivedData.type === 'workflowFailedToActivate' &&
			workflowsStore.workflowId === receivedData.data.workflowId
		) {
			workflowsStore.setWorkflowInactive(receivedData.data.workflowId);
			workflowsStore.setActive(false);

			toast.showError(
				new Error(receivedData.data.errorMessage),
				i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'activated' },
				}) + ':',
			);

			return true;
		}

		if (receivedData.type === 'workflowActivated') {
			workflowsStore.setWorkflowActive(receivedData.data.workflowId);
			return true;
		}

		if (receivedData.type === 'workflowDeactivated') {
			workflowsStore.setWorkflowInactive(receivedData.data.workflowId);
			return true;
		}

		if (receivedData.type === 'executionFinished' || receivedData.type === 'executionRecovered') {
			if (!uiStore.isActionActive.workflowRunning) {
				// No workflow is running so ignore the messages
				return false;
			}

			if (receivedData.type === 'executionFinished') {
				clearPopupWindowState();
				const workflow = workflowsStore.getWorkflowById(receivedData.data.workflowId);
				if (workflow?.meta?.templateId) {
					const easyAiWorkflowJson = getEasyAiWorkflowJson();
					const isEasyAIWorkflow = workflow.meta.templateId === easyAiWorkflowJson.meta.templateId;
					if (isEasyAIWorkflow) {
						telemetry.track(
							'User executed test AI workflow',
							{
								status: receivedData.data.status,
							},
							{ withPostHog: true },
						);
					}
				}
			}

			const { executionId } = receivedData.data;
			if (executionId !== workflowsStore.activeExecutionId) {
				// The workflow which did finish execution did either not get started
				// by this session or we do not have the execution id yet.
				if (isRetry !== true) {
					queuePushMessage(receivedData, retryAttempts);
				}
				return false;
			}

			let showedSuccessToast = false;

			let executionData: Pick<
				IExecutionResponse,
				'workflowId' | 'data' | 'status' | 'startedAt' | 'stoppedAt'
			>;
			if (receivedData.type === 'executionFinished' && receivedData.data.rawData) {
				const { workflowId, status, rawData } = receivedData.data;
				executionData = {
					workflowId,
					data: parse(rawData),
					status,
					startedAt: workflowsStore.workflowExecutionData?.startedAt ?? new Date(),
					stoppedAt: new Date(),
				};
			} else {
				uiStore.setProcessingExecutionResults(true);

				/**
				 * On successful completion without data, we show a success toast
				 * immediately, even though we still need to fetch and deserialize the
				 * full execution data, to minimize perceived latency.
				 */
				if (receivedData.type === 'executionFinished' && receivedData.data.status === 'success') {
					workflowHelpers.setDocumentTitle(
						workflowsStore.getWorkflowById(receivedData.data.workflowId)?.name,
						'IDLE',
					);
					uiStore.removeActiveAction('workflowRunning');
					toast.showMessage({
						title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
						type: 'success',
					});
					showedSuccessToast = true;
				}

				let execution: IExecutionResponse | null;

				try {
					execution = await workflowsStore.fetchExecutionDataById(executionId);
					if (!execution?.data) {
						uiStore.setProcessingExecutionResults(false);
						return false;
					}

					executionData = {
						workflowId: execution.workflowId,
						data: parse(execution.data as unknown as string),
						status: execution.status,
						startedAt: workflowsStore.workflowExecutionData?.startedAt as Date,
						stoppedAt: receivedData.type === 'executionFinished' ? new Date() : undefined,
					};
				} catch {
					uiStore.setProcessingExecutionResults(false);
					return false;
				}
			}

			const iRunExecutionData: IRunExecutionData = {
				startData: executionData.data?.startData,
				resultData: executionData.data?.resultData ?? { runData: {} },
				executionData: executionData.data?.executionData,
			};

			if (workflowsStore.workflowExecutionData?.workflowId === executionData.workflowId) {
				const activeRunData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
				if (activeRunData) {
					for (const key of Object.keys(activeRunData)) {
						if (hasTrimmedItem(activeRunData[key])) continue;
						iRunExecutionData.resultData.runData[key] = activeRunData[key];
					}
				}
			}

			uiStore.setProcessingExecutionResults(false);

			let runDataExecutedErrorMessage = getExecutionError(iRunExecutionData);

			if (executionData.status === 'crashed') {
				runDataExecutedErrorMessage = i18n.baseText('pushConnection.executionFailed.message');
			} else if (executionData.status === 'canceled') {
				runDataExecutedErrorMessage = i18n.baseText(
					'executionsList.showMessage.stopExecution.message',
					{
						interpolate: { activeExecutionId: workflowsStore.activeExecutionId },
					},
				);
			}

			const lineNumber = iRunExecutionData.resultData?.error?.lineNumber;

			codeNodeEditorEventBus.emit('highlightLine', lineNumber ?? 'last');

			const workflow = workflowHelpers.getCurrentWorkflow();
			if (executionData.data?.waitTill !== undefined) {
				const workflowSettings = workflowsStore.workflowSettings;
				const saveManualExecutions = settingsStore.saveManualExecutions;

				const isSavingExecutions =
					workflowSettings.saveManualExecutions === undefined
						? saveManualExecutions
						: workflowSettings.saveManualExecutions;

				if (!isSavingExecutions) {
					globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
						key: 'open-settings',
						action: async () => {
							if (workflowsStore.isNewWorkflow) await workflowHelpers.saveAsNewWorkflow();
							uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
						},
					});
				}

				// Workflow did start but had been put to wait
				workflowHelpers.setDocumentTitle(workflow.name as string, 'IDLE');
			} else if (executionData.status === 'error' || executionData.status === 'canceled') {
				workflowHelpers.setDocumentTitle(workflow.name as string, 'ERROR');

				if (
					iRunExecutionData.resultData.error?.name === 'ExpressionError' &&
					(iRunExecutionData.resultData.error as ExpressionError).functionality === 'pairedItem'
				) {
					const error = iRunExecutionData.resultData.error as ExpressionError;

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
							['paired_item_no_info', 'paired_item_invalid_info'].includes(
								error.context.type as string,
							)
						) {
							const node = workflow.getNode(error.context.nodeCause as string);

							if (node) {
								eventData.is_pinned = !!workflow.getPinDataOfNode(node.name);
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

				if (iRunExecutionData.resultData.error?.name === 'SubworkflowOperationError') {
					const error = iRunExecutionData.resultData.error as SubworkflowOperationError;

					workflowsStore.subWorkflowExecutionError = error;

					toast.showMessage({
						title: error.message,
						message: error.description,
						type: 'error',
						duration: 0,
					});
				} else if (
					(iRunExecutionData.resultData.error?.name === 'NodeOperationError' ||
						iRunExecutionData.resultData.error?.name === 'NodeApiError') &&
					(iRunExecutionData.resultData.error as NodeError).functionality === 'configuration-node'
				) {
					// If the error is a configuration error of the node itself doesn't get executed so we can't use lastNodeExecuted for the title
					let title: string;
					const nodeError = iRunExecutionData.resultData.error as NodeOperationError;
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
					if (executionData.status === 'canceled') {
						toast.showMessage({
							title: i18n.baseText('nodeView.showMessage.stopExecutionTry.title'),
							type: 'success',
						});
					} else {
						let title: string;
						if (iRunExecutionData.resultData.lastNodeExecuted) {
							title = `Problem in node ‘${iRunExecutionData.resultData.lastNodeExecuted}‘`;
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
			} else {
				workflowHelpers.setDocumentTitle(workflow.name as string, 'IDLE');

				const execution = workflowsStore.getWorkflowExecution;
				if (execution?.executedNode) {
					const node = workflowsStore.getNodeByName(execution.executedNode);
					const nodeType = node && nodeTypesStore.getNodeType(node.type, node.typeVersion);
					const nodeOutput =
						execution &&
						execution.executedNode &&
						execution.data?.resultData?.runData?.[execution.executedNode];
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
				} else if (!showedSuccessToast) {
					toast.showMessage({
						title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
						type: 'success',
					});
				}
			}

			// It does not push the runData as it got already pushed with each
			// node that did finish. For that reason copy in here the data
			// which we already have. But if the run data in the store is trimmed,
			// we skip copying so we use the full data from the final message.
			if (workflowsStore.getWorkflowRunData && !hasTrimmedData(workflowsStore.getWorkflowRunData)) {
				iRunExecutionData.resultData.runData = workflowsStore.getWorkflowRunData;
			}

			workflowsStore.executingNode.length = 0;
			workflowsStore.setWorkflowExecutionData(executionData as IExecutionResponse);
			uiStore.removeActiveAction('workflowRunning');

			// Set the node execution issues on all the nodes which produced an error so that
			// it can be displayed in the node-view
			nodeHelpers.updateNodesExecutionIssues();

			const lastNodeExecuted: string | undefined = iRunExecutionData.resultData.lastNodeExecuted;
			let itemsCount = 0;
			if (
				lastNodeExecuted &&
				iRunExecutionData.resultData.runData[lastNodeExecuted] &&
				!runDataExecutedErrorMessage
			) {
				itemsCount =
					iRunExecutionData.resultData.runData[lastNodeExecuted][0].data!.main[0]!.length;
			}

			workflowsStore.setActiveExecutionId(null);

			void useExternalHooks().run('pushConnection.executionFinished', {
				itemsCount,
				nodeName: iRunExecutionData.resultData.lastNodeExecuted,
				errorMessage: runDataExecutedErrorMessage,
				runDataExecutedStartData: iRunExecutionData.startData,
				resultDataError: iRunExecutionData.resultData.error,
			});
		} else if (receivedData.type === 'executionWaiting') {
			// Nothing to do
		} else if (receivedData.type === 'executionStarted') {
			if (workflowsStore.workflowExecutionData?.data && receivedData.data.flattedRunData) {
				workflowsStore.workflowExecutionData.data.resultData.runData = parse(
					receivedData.data.flattedRunData,
				);
			}
		} else if (receivedData.type === 'nodeExecuteAfter') {
			// A node finished to execute. Add its data
			const pushData = receivedData.data;

			/**
			 * When we receive a placeholder in `nodeExecuteAfter`, we fake the items
			 * to be the same count as the data the placeholder is standing in for.
			 * This prevents the items count from jumping up when the execution
			 * finishes and the full data replaces the placeholder.
			 */
			if (
				pushData.itemCount &&
				pushData.data?.data?.main &&
				Array.isArray(pushData.data.data.main[0]) &&
				pushData.data.data.main[0].length < pushData.itemCount
			) {
				pushData.data.data.main[0]?.push(...new Array(pushData.itemCount - 1).fill({ json: {} }));
			}

			workflowsStore.updateNodeExecutionData(pushData);
			void assistantStore.onNodeExecution(pushData);
			void useSchemaPreviewStore().trackSchemaPreviewExecution(pushData);
		} else if (receivedData.type === 'nodeExecuteBefore') {
			// A node started to be executed. Set it as executing.
			workflowsStore.setNodeExecuting(receivedData.data);
		} else if (receivedData.type === 'testWebhookDeleted') {
			// A test-webhook was deleted
			const pushData = receivedData.data;

			if (pushData.workflowId === workflowsStore.workflowId) {
				workflowsStore.executionWaitingForWebhook = false;
				uiStore.removeActiveAction('workflowRunning');
			}
		} else if (receivedData.type === 'testWebhookReceived') {
			// A test-webhook did get called
			const pushData = receivedData.data;

			if (pushData.workflowId === workflowsStore.workflowId) {
				workflowsStore.executionWaitingForWebhook = false;
				workflowsStore.setActiveExecutionId(pushData.executionId);
			}

			void processWaitingPushMessages();
		} else if (receivedData.type === 'reloadNodeType') {
			await nodeTypesStore.getNodeTypes();
			await nodeTypesStore.getFullNodesProperties([receivedData.data]);
		} else if (receivedData.type === 'removeNodeType') {
			const pushData = receivedData.data;

			const nodesToBeRemoved: INodeTypeNameVersion[] = [pushData];

			// Force reload of all credential types
			await credentialsStore.fetchCredentialTypes(false).then(() => {
				nodeTypesStore.removeNodeTypes(nodesToBeRemoved as INodeTypeDescription[]);
			});
		} else if (receivedData.type === 'nodeDescriptionUpdated') {
			await nodeTypesStore.getNodeTypes();
			await credentialsStore.fetchCredentialTypes(true);
		}

		return true;
	}

	function getExecutionError(data: IRunExecutionData | IExecuteContextData) {
		const error = data.resultData.error;

		let errorMessage: string;

		if (data.resultData.lastNodeExecuted && error) {
			errorMessage = error.message || error.description;
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

	return {
		initialize,
		terminate,
		pushMessageReceived,
		queuePushMessage,
		processWaitingPushMessages,
		pushMessageQueue,
		retryTimeout,
	};
}
