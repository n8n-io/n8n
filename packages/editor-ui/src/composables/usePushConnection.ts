import type {
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	IPushData,
	IPushDataExecutionFinished,
} from '@/Interface';

import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTitleChange } from '@/composables/useTitleChange';
import { useToast } from '@/composables/useToast';

import type {
	ExpressionError,
	IDataObject,
	INodeTypeNameVersion,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	SubworkflowOperationError,
	IExecuteContextData,
	NodeOperationError,
	INodeTypeDescription,
} from 'n8n-workflow';
import { TelemetryHelpers } from 'n8n-workflow';

import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/event-bus';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useSettingsStore } from '@/stores/settings.store';
import { parse } from 'flatted';
import { useSegment } from '@/stores/segment.store';
import { ref } from 'vue';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import type { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { PushMessageQueueItem } from '@/types';

export function usePushConnection({ router }: { router: ReturnType<typeof useRouter> }) {
	const workflowHelpers = useWorkflowHelpers({ router });
	const nodeHelpers = useNodeHelpers();
	const titleChange = useTitleChange();
	const toast = useToast();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const collaborationStore = useCollaborationStore();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const orchestrationManagerStore = useOrchestrationStore();
	const pushStore = usePushConnectionStore();
	const settingsStore = useSettingsStore();
	const segmentStore = useSegment();
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();

	const retryTimeout = ref<NodeJS.Timeout | null>(null);
	const pushMessageQueue = ref<PushMessageQueueItem[]>([]);
	const removeEventListener = ref<(() => void) | null>(null);

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((message) => {
			void pushMessageReceived(message);
		});
		collaborationStore.initialize();
	}

	function terminate() {
		collaborationStore.terminate();
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
	function queuePushMessage(event: IPushData, retryAttempts: number) {
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
	async function pushMessageReceived(receivedData: IPushData, isRetry?: boolean): Promise<boolean> {
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

		if (receivedData.type === 'nodeExecuteAfter' || receivedData.type === 'nodeExecuteBefore') {
			if (!uiStore.isActionActive('workflowRunning')) {
				// No workflow is running so ignore the messages
				return false;
			}
			const pushData = receivedData.data;
			if (workflowsStore.activeExecutionId !== pushData.executionId) {
				// The data is not for the currently active execution or
				// we do not have the execution id yet.
				if (isRetry !== true) {
					queuePushMessage(event as unknown as IPushData, retryAttempts);
				}
				return false;
			}
		}

		// recovered execution data is handled like executionFinished data, however for security reasons
		// we need to fetch the data from the server again rather than push it to all clients
		let recoveredPushData: IPushDataExecutionFinished | undefined = undefined;
		if (receivedData.type === 'executionRecovered') {
			const recoveredExecutionId = receivedData.data?.executionId;
			const isWorkflowRunning = uiStore.isActionActive('workflowRunning');
			if (isWorkflowRunning && workflowsStore.activeExecutionId === recoveredExecutionId) {
				// pull execution data for the recovered execution from the server
				const executionData = await workflowsStore.fetchExecutionDataById(
					workflowsStore.activeExecutionId,
				);
				if (executionData?.data) {
					// data comes in as 'flatten' object, so we need to parse it
					executionData.data = parse(executionData.data as unknown as string) as IRunExecutionData;
					const iRunExecutionData: IRunExecutionData = {
						startData: executionData.data?.startData,
						resultData: executionData.data?.resultData ?? { runData: {} },
						executionData: executionData.data?.executionData,
					};
					if (workflowsStore.workflowExecutionData?.workflowId === executionData.workflowId) {
						const activeRunData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
						if (activeRunData) {
							for (const key of Object.keys(activeRunData)) {
								iRunExecutionData.resultData.runData[key] = activeRunData[key];
							}
						}
					}
					const iRun: IRun = {
						data: iRunExecutionData,
						finished: executionData.finished,
						mode: executionData.mode,
						waitTill: executionData.data?.waitTill,
						startedAt: executionData.startedAt,
						stoppedAt: executionData.stoppedAt,
						status: 'crashed',
					};
					if (executionData.data) {
						recoveredPushData = {
							executionId: executionData.id,
							data: iRun,
						};
					}
				}
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
			// The workflow finished executing
			let pushData: IPushDataExecutionFinished;
			if (receivedData.type === 'executionRecovered' && recoveredPushData !== undefined) {
				pushData = recoveredPushData;
			} else {
				pushData = receivedData.data as IPushDataExecutionFinished;
			}

			const { activeExecutionId } = workflowsStore;
			if (activeExecutionId === pushData.executionId) {
				const activeRunData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
				if (activeRunData) {
					for (const key of Object.keys(activeRunData)) {
						if (
							pushData.data.data.resultData.runData[key]?.[0]?.data?.main?.[0]?.[0]?.json
								?.isArtificialRecoveredEventItem === true &&
							activeRunData[key].length > 0
						)
							pushData.data.data.resultData.runData[key] = activeRunData[key];
					}
				}
				workflowsStore.finishActiveExecution(pushData);
			}

			if (!uiStore.isActionActive('workflowRunning')) {
				// No workflow is running so ignore the messages
				return false;
			}

			if (activeExecutionId !== pushData.executionId) {
				// The workflow which did finish execution did either not get started
				// by this session or we do not have the execution id yet.
				if (isRetry !== true) {
					queuePushMessage(event as unknown as IPushData, retryAttempts);
				}
				return false;
			}

			const runDataExecuted = pushData.data;

			let runDataExecutedErrorMessage = getExecutionError(runDataExecuted.data);

			if (runDataExecuted.status === 'crashed') {
				runDataExecutedErrorMessage = i18n.baseText('pushConnection.executionFailed.message');
			} else if (runDataExecuted.status === 'canceled') {
				runDataExecutedErrorMessage = i18n.baseText(
					'executionsList.showMessage.stopExecution.message',
					{
						interpolate: { activeExecutionId },
					},
				);
			}

			const lineNumber = runDataExecuted?.data?.resultData?.error?.lineNumber;

			codeNodeEditorEventBus.emit('error-line-number', lineNumber || 'final');

			const workflow = workflowHelpers.getCurrentWorkflow();
			if (runDataExecuted.waitTill !== undefined) {
				const workflowSettings = workflowsStore.workflowSettings;
				const saveManualExecutions = settingsStore.saveManualExecutions;

				const isSavingExecutions =
					workflowSettings.saveManualExecutions === undefined
						? saveManualExecutions
						: workflowSettings.saveManualExecutions;

				let action;
				if (!isSavingExecutions) {
					globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
						key: 'open-settings',
						action: async () => {
							if (workflowsStore.isNewWorkflow) await workflowHelpers.saveAsNewWorkflow();
							uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
						},
					});

					action =
						'<a data-action="open-settings">Turn on saving manual executions</a> and run again to see what happened after this node.';
				} else {
					action = `<a href="/workflow/${workflow.id}/executions/${activeExecutionId}">View the execution</a> to see what happened after this node.`;
				}

				// Workflow did start but had been put to wait
				titleChange.titleSet(workflow.name as string, 'IDLE');
				toast.showToast({
					title: 'Workflow started waiting',
					message: `${action} <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">More info</a>`,
					type: 'success',
					duration: 0,
				});
			} else if (runDataExecuted.finished !== true) {
				titleChange.titleSet(workflow.name as string, 'ERROR');

				if (
					runDataExecuted.data.resultData.error?.name === 'ExpressionError' &&
					(runDataExecuted.data.resultData.error as ExpressionError).context.functionality ===
						'pairedItem'
				) {
					const error = runDataExecuted.data.resultData.error as ExpressionError;

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

				if (runDataExecuted.data.resultData.error?.name === 'SubworkflowOperationError') {
					const error = runDataExecuted.data.resultData.error as SubworkflowOperationError;

					workflowsStore.subWorkflowExecutionError = error;

					toast.showMessage({
						title: error.message,
						message: error.description,
						type: 'error',
						duration: 0,
					});
				} else if (
					runDataExecuted.data.resultData.error?.name === 'NodeOperationError' &&
					(runDataExecuted.data.resultData.error as NodeOperationError).functionality ===
						'configuration-node'
				) {
					// If the error is a configuration error of the node itself doesn't get executed so we can't use lastNodeExecuted for the title
					let title: string;
					const nodeError = runDataExecuted.data.resultData.error as NodeOperationError;
					if (nodeError.node.name) {
						title = `Error in sub-node ‘${nodeError.node.name}‘`;
					} else {
						title = 'Problem executing workflow';
					}

					toast.showMessage({
						title,
						message:
							(nodeError?.description ?? runDataExecutedErrorMessage) +
							i18n.baseText('pushConnection.executionError.openNode', {
								interpolate: {
									node: nodeError.node.name,
								},
							}),
						type: 'error',
						duration: 0,
						dangerouslyUseHTMLString: true,
					});
				} else {
					let title: string;
					const isManualExecutionCancelled =
						runDataExecuted.mode === 'manual' && runDataExecuted.status === 'canceled';

					// Do not show the error message if the workflow got canceled manually
					if (isManualExecutionCancelled) {
						toast.showMessage({
							title: i18n.baseText('nodeView.showMessage.stopExecutionTry.title'),
							type: 'success',
						});
					} else {
						if (runDataExecuted.data.resultData.lastNodeExecuted) {
							title = `Problem in node ‘${runDataExecuted.data.resultData.lastNodeExecuted}‘`;
						} else {
							title = 'Problem executing workflow';
						}

						toast.showMessage({
							title,
							message: runDataExecutedErrorMessage,
							type: 'error',
							duration: 0,
							dangerouslyUseHTMLString: true,
						});
					}
				}
			} else {
				// Workflow did execute without a problem
				titleChange.titleSet(workflow.name as string, 'IDLE');

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
				} else {
					toast.showMessage({
						title: i18n.baseText('pushConnection.workflowExecutedSuccessfully'),
						type: 'success',
					});
				}
			}

			// It does not push the runData as it got already pushed with each
			// node that did finish. For that reason copy in here the data
			// which we already have.
			if (workflowsStore.getWorkflowRunData) {
				runDataExecuted.data.resultData.runData = workflowsStore.getWorkflowRunData;
			}

			workflowsStore.executingNode.length = 0;
			workflowsStore.setWorkflowExecutionData(runDataExecuted as IExecutionResponse);
			uiStore.removeActiveAction('workflowRunning');

			// Set the node execution issues on all the nodes which produced an error so that
			// it can be displayed in the node-view
			nodeHelpers.updateNodesExecutionIssues();

			const lastNodeExecuted: string | undefined = runDataExecuted.data.resultData.lastNodeExecuted;
			let itemsCount = 0;
			if (
				lastNodeExecuted &&
				runDataExecuted.data.resultData.runData[lastNodeExecuted] &&
				!runDataExecutedErrorMessage
			) {
				itemsCount =
					runDataExecuted.data.resultData.runData[lastNodeExecuted][0].data!.main[0]!.length;
			}

			void useExternalHooks().run('pushConnection.executionFinished', {
				itemsCount,
				nodeName: runDataExecuted.data.resultData.lastNodeExecuted,
				errorMessage: runDataExecutedErrorMessage,
				runDataExecutedStartData: runDataExecuted.data.startData,
				resultDataError: runDataExecuted.data.resultData.error,
			});
			if (!runDataExecuted.data.resultData.error) {
				segmentStore.trackSuccessfulWorkflowExecution(runDataExecuted);
			}
		} else if (receivedData.type === 'executionStarted') {
			const pushData = receivedData.data;

			const executionData: IExecutionsCurrentSummaryExtended = {
				id: pushData.executionId,
				finished: false,
				mode: pushData.mode,
				startedAt: pushData.startedAt,
				retryOf: pushData.retryOf,
				workflowId: pushData.workflowId,
				workflowName: pushData.workflowName,
			};

			workflowsStore.addActiveExecution(executionData);
		} else if (receivedData.type === 'nodeExecuteAfter') {
			// A node finished to execute. Add its data
			const pushData = receivedData.data;
			workflowsStore.addNodeExecutionData(pushData);
			workflowsStore.removeExecutingNode(pushData.nodeName);
		} else if (receivedData.type === 'nodeExecuteBefore') {
			// A node started to be executed. Set it as executing.
			const pushData = receivedData.data;
			workflowsStore.addExecutingNode(pushData.nodeName);
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
				workflowsStore.activeExecutionId = pushData.executionId;
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
		removeEventListener,
		retryTimeout,
	};
}
