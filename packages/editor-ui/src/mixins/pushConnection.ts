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
} from 'n8n-workflow';
import { TelemetryHelpers } from 'n8n-workflow';

import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { codeNodeEditorEventBus, globalLinkActionsEventBus } from '@/event-bus';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useSettingsStore } from '@/stores/settings.store';
import { parse } from 'flatted';
import { useSegment } from '@/stores/segment.store';
import { defineComponent } from 'vue';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

export const pushConnection = defineComponent({
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });
		const nodeHelpers = useNodeHelpers();
		return {
			...useTitleChange(),
			...useToast(),
			nodeHelpers,
			workflowHelpers,
		};
	},
	data() {
		return {
			retryTimeout: null as NodeJS.Timeout | null,
			pushMessageQueue: [] as Array<{ message: IPushData; retriesLeft: number }>,
			removeEventListener: null as (() => void) | null,
		};
	},
	created() {
		this.removeEventListener = this.pushStore.addEventListener((message) => {
			void this.pushMessageReceived(message);
		});
	},
	unmounted() {
		if (typeof this.removeEventListener === 'function') {
			this.removeEventListener();
		}
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNodeTypesStore,
			useUIStore,
			useWorkflowsStore,
			useSettingsStore,
			useSegment,
			useOrchestrationStore,
			usePushConnectionStore,
			useCollaborationStore,
		),
		pushRef(): string {
			return this.rootStore.pushRef;
		},
	},
	methods: {
		/**
		 * Sometimes the push message is faster as the result from
		 * the REST API so we do not know yet what execution ID
		 * is currently active. So internally resend the message
		 * a few more times
		 */
		queuePushMessage(event: IPushData, retryAttempts: number) {
			this.pushMessageQueue.push({ message: event, retriesLeft: retryAttempts });

			if (this.retryTimeout === null) {
				this.retryTimeout = setTimeout(this.processWaitingPushMessages, 20);
			}
		},

		/**
		 * Process the push messages which are waiting in the queue
		 */
		async processWaitingPushMessages() {
			if (this.retryTimeout !== null) {
				clearTimeout(this.retryTimeout);
				this.retryTimeout = null;
			}

			const queueLength = this.pushMessageQueue.length;
			for (let i = 0; i < queueLength; i++) {
				const messageData = this.pushMessageQueue.shift();

				const result = await this.pushMessageReceived(messageData!.message, true);
				if (!result) {
					// Was not successful
					messageData!.retriesLeft -= 1;

					if (messageData!.retriesLeft > 0) {
						// If still retries are left add it back and stop execution
						this.pushMessageQueue.unshift(messageData!);
					}
					break;
				}
			}

			if (this.pushMessageQueue.length !== 0 && this.retryTimeout === null) {
				this.retryTimeout = setTimeout(this.processWaitingPushMessages, 25);
			}
		},

		/**
		 * Process a newly received message
		 */
		async pushMessageReceived(receivedData: IPushData, isRetry?: boolean): Promise<boolean> {
			const retryAttempts = 5;

			if (receivedData.type === 'sendWorkerStatusMessage') {
				const pushData = receivedData.data;
				this.orchestrationManagerStore.updateWorkerStatus(pushData.status);
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
				this.pushMessageQueue.length
			) {
				// If there are already messages in the queue add the new one that all of them
				// get executed in order
				this.queuePushMessage(receivedData, retryAttempts);
				return false;
			}

			if (receivedData.type === 'nodeExecuteAfter' || receivedData.type === 'nodeExecuteBefore') {
				if (!this.uiStore.isActionActive('workflowRunning')) {
					// No workflow is running so ignore the messages
					return false;
				}
				const pushData = receivedData.data;
				if (this.workflowsStore.activeExecutionId !== pushData.executionId) {
					// The data is not for the currently active execution or
					// we do not have the execution id yet.
					if (isRetry !== true) {
						this.queuePushMessage(event, retryAttempts);
					}
					return false;
				}
			}

			// recovered execution data is handled like executionFinished data, however for security reasons
			// we need to fetch the data from the server again rather than push it to all clients
			let recoveredPushData: IPushDataExecutionFinished | undefined = undefined;
			if (receivedData.type === 'executionRecovered') {
				const recoveredExecutionId = receivedData.data?.executionId;
				const isWorkflowRunning = this.uiStore.isActionActive('workflowRunning');
				if (isWorkflowRunning && this.workflowsStore.activeExecutionId === recoveredExecutionId) {
					// pull execution data for the recovered execution from the server
					const executionData = await this.workflowsStore.fetchExecutionDataById(
						this.workflowsStore.activeExecutionId,
					);
					if (executionData?.data) {
						// data comes in as 'flatten' object, so we need to parse it
						executionData.data = parse(
							executionData.data as unknown as string,
						) as IRunExecutionData;
						const iRunExecutionData: IRunExecutionData = {
							startData: executionData.data?.startData,
							resultData: executionData.data?.resultData ?? { runData: {} },
							executionData: executionData.data?.executionData,
						};
						if (
							this.workflowsStore.workflowExecutionData?.workflowId === executionData.workflowId
						) {
							const activeRunData =
								this.workflowsStore.workflowExecutionData?.data?.resultData?.runData;
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
				this.workflowsStore.workflowId === receivedData.data.workflowId
			) {
				this.workflowsStore.setWorkflowInactive(receivedData.data.workflowId);
				this.workflowsStore.setActive(false);

				this.showError(
					new Error(receivedData.data.errorMessage),
					this.$locale.baseText('workflowActivator.showError.title', {
						interpolate: { newStateName: 'activated' },
					}) + ':',
				);

				return true;
			}

			if (receivedData.type === 'workflowActivated') {
				this.workflowsStore.setWorkflowActive(receivedData.data.workflowId);
				return true;
			}

			if (receivedData.type === 'workflowDeactivated') {
				this.workflowsStore.setWorkflowInactive(receivedData.data.workflowId);
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

				const { activeExecutionId } = this.workflowsStore;
				if (activeExecutionId === pushData.executionId) {
					const activeRunData =
						this.workflowsStore.workflowExecutionData?.data?.resultData?.runData;
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
					this.workflowsStore.finishActiveExecution(pushData);
				}

				if (!this.uiStore.isActionActive('workflowRunning')) {
					// No workflow is running so ignore the messages
					return false;
				}

				if (activeExecutionId !== pushData.executionId) {
					// The workflow which did finish execution did either not get started
					// by this session or we do not have the execution id yet.
					if (isRetry !== true) {
						this.queuePushMessage(event, retryAttempts);
					}
					return false;
				}

				const runDataExecuted = pushData.data;

				let runDataExecutedErrorMessage = this.getExecutionError(runDataExecuted.data);

				if (runDataExecuted.status === 'crashed') {
					runDataExecutedErrorMessage = this.$locale.baseText(
						'pushConnection.executionFailed.message',
					);
				} else if (runDataExecuted.status === 'canceled') {
					runDataExecutedErrorMessage = this.$locale.baseText(
						'executionsList.showMessage.stopExecution.message',
						{
							interpolate: { activeExecutionId },
						},
					);
				}

				const lineNumber = runDataExecuted?.data?.resultData?.error?.lineNumber;

				codeNodeEditorEventBus.emit('error-line-number', lineNumber || 'final');

				const workflow = this.workflowHelpers.getCurrentWorkflow();
				if (runDataExecuted.waitTill !== undefined) {
					const workflowSettings = this.workflowsStore.workflowSettings;
					const saveManualExecutions = this.settingsStore.saveManualExecutions;

					const isSavingExecutions =
						workflowSettings.saveManualExecutions === undefined
							? saveManualExecutions
							: workflowSettings.saveManualExecutions;

					let action;
					if (!isSavingExecutions) {
						globalLinkActionsEventBus.emit('registerGlobalLinkAction', {
							key: 'open-settings',
							action: async () => {
								if (this.workflowsStore.isNewWorkflow)
									await this.workflowHelpers.saveAsNewWorkflow();
								this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
							},
						});

						action =
							'<a data-action="open-settings">Turn on saving manual executions</a> and run again to see what happened after this node.';
					} else {
						action = `<a href="/workflow/${workflow.id}/executions/${activeExecutionId}">View the execution</a> to see what happened after this node.`;
					}

					// Workflow did start but had been put to wait
					this.titleSet(workflow.name as string, 'IDLE');
					this.showToast({
						title: 'Workflow started waiting',
						message: `${action} <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">More info</a>`,
						type: 'success',
						duration: 0,
					});
				} else if (runDataExecuted.finished !== true) {
					this.titleSet(workflow.name as string, 'ERROR');

					if (
						runDataExecuted.data.resultData.error?.name === 'ExpressionError' &&
						(runDataExecuted.data.resultData.error as ExpressionError).context.functionality ===
							'pairedItem'
					) {
						const error = runDataExecuted.data.resultData.error as ExpressionError;

						void this.workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
							const eventData: IDataObject = {
								caused_by_credential: false,
								error_message: error.description,
								error_title: error.message,
								error_type: error.context.type,
								node_graph_string: JSON.stringify(
									TelemetryHelpers.generateNodesGraph(
										workflowData as IWorkflowBase,
										this.workflowHelpers.getNodeTypes(),
									).nodeGraph,
								),
								workflow_id: this.workflowsStore.workflowId,
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

							this.$telemetry.track('Instance FE emitted paired item error', eventData, {
								withPostHog: true,
							});
						});
					}

					if (runDataExecuted.data.resultData.error?.name === 'SubworkflowOperationError') {
						const error = runDataExecuted.data.resultData.error as SubworkflowOperationError;

						this.workflowsStore.subWorkflowExecutionError = error;

						this.showMessage({
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

						this.showMessage({
							title,
							message:
								(nodeError?.description ?? runDataExecutedErrorMessage) +
								this.$locale.baseText('pushConnection.executionError.openNode', {
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
							this.showMessage({
								title: this.$locale.baseText('nodeView.showMessage.stopExecutionTry.title'),
								type: 'success',
							});
						} else {
							if (runDataExecuted.data.resultData.lastNodeExecuted) {
								title = `Problem in node ‘${runDataExecuted.data.resultData.lastNodeExecuted}‘`;
							} else {
								title = 'Problem executing workflow';
							}

							this.showMessage({
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
					this.titleSet(workflow.name as string, 'IDLE');

					const execution = this.workflowsStore.getWorkflowExecution;
					if (execution?.executedNode) {
						const node = this.workflowsStore.getNodeByName(execution.executedNode);
						const nodeType = node && this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
						const nodeOutput =
							execution &&
							execution.executedNode &&
							execution.data?.resultData?.runData?.[execution.executedNode];
						if (nodeType?.polling && !nodeOutput) {
							this.showMessage({
								title: this.$locale.baseText('pushConnection.pollingNode.dataNotFound', {
									interpolate: {
										service: getTriggerNodeServiceName(nodeType),
									},
								}),
								message: this.$locale.baseText('pushConnection.pollingNode.dataNotFound.message', {
									interpolate: {
										service: getTriggerNodeServiceName(nodeType),
									},
								}),
								type: 'success',
							});
						} else {
							this.showMessage({
								title: this.$locale.baseText('pushConnection.nodeExecutedSuccessfully'),
								type: 'success',
							});
						}
					} else {
						this.showMessage({
							title: this.$locale.baseText('pushConnection.workflowExecutedSuccessfully'),
							type: 'success',
						});
					}
				}

				// It does not push the runData as it got already pushed with each
				// node that did finish. For that reason copy in here the data
				// which we already have.
				if (this.workflowsStore.getWorkflowRunData) {
					runDataExecuted.data.resultData.runData = this.workflowsStore.getWorkflowRunData;
				}

				this.workflowsStore.executingNode.length = 0;
				this.workflowsStore.setWorkflowExecutionData(runDataExecuted as IExecutionResponse);
				this.uiStore.removeActiveAction('workflowRunning');

				// Set the node execution issues on all the nodes which produced an error so that
				// it can be displayed in the node-view
				this.nodeHelpers.updateNodesExecutionIssues();

				const lastNodeExecuted: string | undefined =
					runDataExecuted.data.resultData.lastNodeExecuted;
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
					this.segmentStore.trackSuccessfulWorkflowExecution(runDataExecuted);
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

				this.workflowsStore.addActiveExecution(executionData);
			} else if (receivedData.type === 'nodeExecuteAfter') {
				// A node finished to execute. Add its data
				const pushData = receivedData.data;
				this.workflowsStore.addNodeExecutionData(pushData);
				this.workflowsStore.removeExecutingNode(pushData.nodeName);
			} else if (receivedData.type === 'nodeExecuteBefore') {
				// A node started to be executed. Set it as executing.
				const pushData = receivedData.data;
				this.workflowsStore.addExecutingNode(pushData.nodeName);
			} else if (receivedData.type === 'testWebhookDeleted') {
				// A test-webhook was deleted
				const pushData = receivedData.data;

				if (pushData.workflowId === this.workflowsStore.workflowId) {
					this.workflowsStore.executionWaitingForWebhook = false;
					this.uiStore.removeActiveAction('workflowRunning');
				}
			} else if (receivedData.type === 'testWebhookReceived') {
				// A test-webhook did get called
				const pushData = receivedData.data;

				if (pushData.workflowId === this.workflowsStore.workflowId) {
					this.workflowsStore.executionWaitingForWebhook = false;
					this.workflowsStore.activeExecutionId = pushData.executionId;
				}

				void this.processWaitingPushMessages();
			} else if (receivedData.type === 'reloadNodeType') {
				await this.nodeTypesStore.getNodeTypes();
				await this.nodeTypesStore.getFullNodesProperties([receivedData.data]);
			} else if (receivedData.type === 'removeNodeType') {
				const pushData = receivedData.data;

				const nodesToBeRemoved: INodeTypeNameVersion[] = [pushData];

				// Force reload of all credential types
				await this.credentialsStore.fetchCredentialTypes(false).then(() => {
					this.nodeTypesStore.removeNodeTypes(nodesToBeRemoved);
				});
			} else if (receivedData.type === 'nodeDescriptionUpdated') {
				await this.nodeTypesStore.getNodeTypes();
				await this.credentialsStore.fetchCredentialTypes(true);
			}
			return true;
		},
		getExecutionError(data: IRunExecutionData | IExecuteContextData) {
			const error = data.resultData.error;

			let errorMessage: string;

			if (data.resultData.lastNodeExecuted && error) {
				errorMessage = error.message || error.description;
			} else {
				errorMessage = this.$locale.baseText('pushConnection.executionError', {
					interpolate: { error: '!' },
				});

				if (error?.message) {
					let nodeName: string | undefined;
					if ('node' in error) {
						nodeName = typeof error.node === 'string' ? error.node : error.node!.name;
					}

					const receivedError = nodeName ? `${nodeName}: ${error.message}` : error.message;
					errorMessage = this.$locale.baseText('pushConnection.executionError', {
						interpolate: {
							error: `.${this.$locale.baseText('pushConnection.executionError.details', {
								interpolate: {
									details: receivedError,
								},
							})}`,
						},
					});
				}
			}

			return errorMessage;
		},
	},
});
