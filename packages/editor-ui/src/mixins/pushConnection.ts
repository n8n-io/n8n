import { IExecutionResponse, IExecutionsCurrentSummaryExtended, IPushData } from '@/Interface';

import { externalHooks } from '@/mixins/externalHooks';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { showMessage } from '@/mixins/showMessage';
import { titleChange } from '@/mixins/titleChange';
import { workflowHelpers } from '@/mixins/workflowHelpers';

import {
	ExpressionError,
	IDataObject,
	INodeTypeNameVersion,
	IWorkflowBase,
	SubworkflowOperationError,
	TelemetryHelpers,
} from 'n8n-workflow';

import mixins from 'vue-typed-mixins';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';
import { getTriggerNodeServiceName } from '@/utils';
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useCredentialsStore } from '@/stores/credentials';

export const pushConnection = mixins(
	externalHooks,
	nodeHelpers,
	showMessage,
	titleChange,
	workflowHelpers,
).extend({
	data() {
		return {
			eventSource: null as EventSource | null,
			reconnectTimeout: null as NodeJS.Timeout | null,
			retryTimeout: null as NodeJS.Timeout | null,
			pushMessageQueue: [] as Array<{ event: Event; retriesLeft: number }>,
			connectRetries: 0,
			lostConnection: false,
		};
	},
	computed: {
		...mapStores(useCredentialsStore, useNodeTypesStore, useUIStore, useWorkflowsStore),
		sessionId(): string {
			return this.rootStore.sessionId;
		},
	},
	methods: {
		pushAutomaticReconnect(): void {
			if (this.reconnectTimeout !== null) {
				return;
			}

			this.reconnectTimeout = setTimeout(() => {
				this.connectRetries++;
				const isWorkflowRunning = this.uiStore.isActionActive('workflowRunning');
				if (this.connectRetries > 3 && !this.lostConnection && isWorkflowRunning) {
					this.lostConnection = true;

					this.workflowsStore.executingNode = null;
					this.uiStore.removeActiveAction('workflowRunning');

					this.$showMessage({
						title: this.$locale.baseText('pushConnection.executionFailed'),
						message: this.$locale.baseText('pushConnection.executionFailed.message'),
						type: 'error',
						duration: 0,
					});
				}
				this.pushConnect();
			}, 3000);
		},

		/**
		 * Connect to server to receive data via EventSource
		 */
		pushConnect(): void {
			// Make sure existing event-source instances get
			// always removed that we do not end up with multiple ones
			this.pushDisconnect();

			const connectionUrl = `${this.rootStore.getRestUrl}/push?sessionId=${this.sessionId}`;

			this.eventSource = new EventSource(connectionUrl, { withCredentials: true });
			this.eventSource.addEventListener('message', this.pushMessageReceived, false);

			this.eventSource.addEventListener(
				'open',
				() => {
					this.connectRetries = 0;
					this.lostConnection = false;

					this.rootStore.pushConnectionActive = true;
					if (this.reconnectTimeout !== null) {
						clearTimeout(this.reconnectTimeout);
						this.reconnectTimeout = null;
					}
				},
				false,
			);

			this.eventSource.addEventListener(
				'error',
				() => {
					this.pushDisconnect();

					if (this.reconnectTimeout !== null) {
						clearTimeout(this.reconnectTimeout);
						this.reconnectTimeout = null;
					}

					this.rootStore.pushConnectionActive = false;
					this.pushAutomaticReconnect();
				},
				false,
			);
		},

		/**
		 * Close connection to server
		 */
		pushDisconnect(): void {
			if (this.eventSource !== null) {
				this.eventSource.close();
				this.eventSource = null;

				this.rootStore.pushConnectionActive = false;
			}
		},

		/**
		 * Sometimes the push message is faster as the result from
		 * the REST API so we do not know yet what execution ID
		 * is currently active. So internally resend the message
		 * a few more times
		 *
		 */
		queuePushMessage(event: Event, retryAttempts: number) {
			this.pushMessageQueue.push({ event, retriesLeft: retryAttempts });

			if (this.retryTimeout === null) {
				this.retryTimeout = setTimeout(this.processWaitingPushMessages, 20);
			}
		},

		/**
		 * Process the push messages which are waiting in the queue
		 */
		processWaitingPushMessages() {
			if (this.retryTimeout !== null) {
				clearTimeout(this.retryTimeout);
				this.retryTimeout = null;
			}

			const queueLength = this.pushMessageQueue.length;
			for (let i = 0; i < queueLength; i++) {
				const messageData = this.pushMessageQueue.shift();

				if (this.pushMessageReceived(messageData!.event, true) === false) {
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
		 *
		 * @param {Event} event The event data with the message data
		 * @param {boolean} [isRetry] If it is a retry
		 */
		pushMessageReceived(event: Event, isRetry?: boolean): boolean {
			const retryAttempts = 5;
			let receivedData: IPushData;
			try {
				// @ts-ignore
				receivedData = JSON.parse(event.data);
			} catch (error) {
				return false;
			}

			if (receivedData.type === 'sendConsoleMessage') {
				const pushData = receivedData.data;
				console.log(pushData.source, ...pushData.messages); // eslint-disable-line no-console
				return true;
			}

			if (
				!['testWebhookReceived'].includes(receivedData.type) &&
				isRetry !== true &&
				this.pushMessageQueue.length
			) {
				// If there are already messages in the queue add the new one that all of them
				// get executed in order
				this.queuePushMessage(event, retryAttempts);
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

			if (receivedData.type === 'executionFinished') {
				// The workflow finished executing
				const pushData = receivedData.data;

				this.workflowsStore.finishActiveExecution(pushData);

				if (!this.uiStore.isActionActive('workflowRunning')) {
					// No workflow is running so ignore the messages
					return false;
				}

				if (this.workflowsStore.activeExecutionId !== pushData.executionId) {
					// The workflow which did finish execution did either not get started
					// by this session or we do not have the execution id yet.
					if (isRetry !== true) {
						this.queuePushMessage(event, retryAttempts);
					}
					return false;
				}

				const runDataExecuted = pushData.data;

				const runDataExecutedErrorMessage = this.$getExecutionError(runDataExecuted.data);

				const lineNumber =
					runDataExecuted &&
					runDataExecuted.data &&
					runDataExecuted.data.resultData &&
					runDataExecuted.data.resultData.error &&
					runDataExecuted.data.resultData.error.lineNumber;

				codeNodeEditorEventBus.$emit('error-line-number', lineNumber || 'final');

				const workflow = this.getCurrentWorkflow();
				if (runDataExecuted.waitTill !== undefined) {
					const activeExecutionId = this.workflowsStore.activeExecutionId;
					const workflowSettings = this.workflowsStore.workflowSettings;
					const saveManualExecutions = this.rootStore.saveManualExecutions;

					const isSavingExecutions =
						workflowSettings.saveManualExecutions === undefined
							? saveManualExecutions
							: workflowSettings.saveManualExecutions;

					let action;
					if (!isSavingExecutions) {
						this.$root.$emit('registerGlobalLinkAction', 'open-settings', async () => {
							if (this.workflowsStore.isNewWorkflow) await this.saveAsNewWorkflow();
							this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
						});

						action =
							'<a data-action="open-settings">Turn on saving manual executions</a> and run again to see what happened after this node.';
					} else {
						action = `<a href="/workflow/${workflow.id}/executions/${activeExecutionId}">View the execution</a> to see what happened after this node.`;
					}

					// Workflow did start but had been put to wait
					this.$titleSet(workflow.name as string, 'IDLE');
					this.$showToast({
						title: 'Workflow started waiting',
						message: `${action} <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">More info</a>`,
						type: 'success',
						duration: 0,
					});
				} else if (runDataExecuted.finished !== true) {
					this.$titleSet(workflow.name as string, 'ERROR');

					if (
						runDataExecuted.data.resultData.error?.name === 'ExpressionError' &&
						(runDataExecuted.data.resultData.error as ExpressionError).context.functionality ===
							'pairedItem'
					) {
						const error = runDataExecuted.data.resultData.error as ExpressionError;

						this.getWorkflowDataToSave().then((workflowData) => {
							const eventData: IDataObject = {
								caused_by_credential: false,
								error_message: error.description,
								error_title: error.message,
								error_type: error.context.type,
								node_graph_string: JSON.stringify(
									TelemetryHelpers.generateNodesGraph(
										workflowData as IWorkflowBase,
										this.getNodeTypes(),
									).nodeGraph,
								),
								workflow_id: this.workflowsStore.workflowId,
							};

							if (
								error.context.nodeCause &&
								['no pairing info', 'invalid pairing info'].includes(error.context.type as string)
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

							this.$telemetry.track('Instance FE emitted paired item error', eventData);
						});
					}

					if (runDataExecuted.data.resultData.error?.name === 'SubworkflowOperationError') {
						const error = runDataExecuted.data.resultData.error as SubworkflowOperationError;

						this.workflowsStore.subWorkflowExecutionError = error;

						this.$showMessage({
							title: error.message,
							message: error.description,
							type: 'error',
							duration: 0,
						});
					} else {
						let title: string;
						if (runDataExecuted.data.resultData.lastNodeExecuted) {
							title = `Problem in node ‘${runDataExecuted.data.resultData.lastNodeExecuted}‘`;
						} else {
							title = 'Problem executing workflow';
						}

						this.$showMessage({
							title,
							message: runDataExecutedErrorMessage,
							type: 'error',
							duration: 0,
						});
					}
				} else {
					// Workflow did execute without a problem
					this.$titleSet(workflow.name as string, 'IDLE');

					const execution = this.workflowsStore.getWorkflowExecution;
					if (execution && execution.executedNode) {
						const node = this.workflowsStore.getNodeByName(execution.executedNode);
						const nodeType = node && this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
						const nodeOutput =
							execution &&
							execution.executedNode &&
							execution.data &&
							execution.data.resultData &&
							execution.data.resultData.runData &&
							execution.data.resultData.runData[execution.executedNode];
						if (node && nodeType && !nodeOutput) {
							this.$showMessage({
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
							this.$showMessage({
								title: this.$locale.baseText('pushConnection.nodeExecutedSuccessfully'),
								type: 'success',
							});
						}
					} else {
						this.$showMessage({
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

				this.workflowsStore.executingNode = null;
				this.workflowsStore.setWorkflowExecutionData(runDataExecuted as IExecutionResponse);
				this.uiStore.removeActiveAction('workflowRunning');

				// Set the node execution issues on all the nodes which produced an error so that
				// it can be displayed in the node-view
				this.updateNodesExecutionIssues();

				const lastNodeExecuted: string | undefined =
					runDataExecuted.data.resultData.lastNodeExecuted;
				let itemsCount = 0;
				if (
					lastNodeExecuted &&
					runDataExecuted.data.resultData.runData[lastNodeExecuted as string] &&
					!runDataExecutedErrorMessage
				) {
					itemsCount =
						runDataExecuted.data.resultData.runData[lastNodeExecuted as string][0].data!.main[0]!
							.length;
				}

				this.$externalHooks().run('pushConnection.executionFinished', {
					itemsCount,
					nodeName: runDataExecuted.data.resultData.lastNodeExecuted,
					errorMessage: runDataExecutedErrorMessage,
					runDataExecutedStartData: runDataExecuted.data.startData,
					resultDataError: runDataExecuted.data.resultData.error,
				});
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
			} else if (receivedData.type === 'nodeExecuteBefore') {
				// A node started to be executed. Set it as executing.
				const pushData = receivedData.data;
				this.workflowsStore.executingNode = pushData.nodeName;
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

				this.processWaitingPushMessages();
			} else if (receivedData.type === 'reloadNodeType') {
				this.nodeTypesStore.getNodeTypes();
				this.nodeTypesStore.getFullNodesProperties([receivedData.data]);
			} else if (receivedData.type === 'removeNodeType') {
				const pushData = receivedData.data;

				const nodesToBeRemoved: INodeTypeNameVersion[] = [pushData];

				// Force reload of all credential types
				this.credentialsStore.fetchCredentialTypes(false).then(() => {
					this.nodeTypesStore.removeNodeTypes(nodesToBeRemoved);
				});
			} else if (receivedData.type === 'nodeDescriptionUpdated') {
				this.nodeTypesStore.getNodeTypes();
				this.credentialsStore.fetchCredentialTypes(true);
			}
			return true;
		},
	},
});
