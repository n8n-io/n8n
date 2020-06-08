import {
	IExecutionsCurrentSummaryExtended,
	IPushData,
	IPushDataExecutionFinished,
	IPushDataExecutionStarted,
	IPushDataNodeExecuteAfter,
	IPushDataNodeExecuteBefore,
	IPushDataTestWebhook,
} from '../../Interface';

import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

export const pushConnection = mixins(
	nodeHelpers,
	showMessage,
)
	.extend({
		data () {
			return {
				eventSource: null as EventSource | null,
				reconnectTimeout: null as NodeJS.Timeout | null,
				retryTimeout: null as NodeJS.Timeout | null,
				pushMessageQueue: [] as Array<{ event: Event, retriesLeft: number }>,
			};
		},
		computed: {
			sessionId (): string {
				return this.$store.getters.sessionId;
			},
		},
		methods: {
			pushAutomaticReconnect (): void {
				console.log('pushAutomaticReconnect: 1');
				if (this.reconnectTimeout !== null) {
					console.log('pushAutomaticReconnect: 2');
					return;
				}

				this.reconnectTimeout = setTimeout(() => {
					console.log('pushAutomaticReconnect: 3');
					this.pushConnect();
				}, 3000);
			},

			/**
			 * Connect to server to receive data via EventSource
			 */
			pushConnect (): void {
				console.log('pushConnect: 1');

				// Make sure existing event-source instances get
				// always removed that we do not end up with multiple ones
				this.pushDisconnect();

				const connectionUrl = `${this.$store.getters.getRestUrl}/push?sessionId=${this.sessionId}`;

				this.eventSource = new EventSource(connectionUrl);
				this.eventSource.addEventListener('message', this.pushMessageReceived, false);

				console.log('pushConnect: 2');
				this.eventSource.addEventListener('open', () => {
					console.log('pushConnect: 20 - open');
					this.$store.commit('setPushConnectionActive', true);
					console.log('pushConnect: 21');
					if (this.reconnectTimeout !== null) {
						console.log('pushConnect: 22');
						clearTimeout(this.reconnectTimeout);
						this.reconnectTimeout = null;
					}
				}, false);

				this.eventSource.addEventListener('error', () => {
					console.log('pushConnect: 30 - error');

					this.pushDisconnect();

					if (this.reconnectTimeout !== null) {
						console.log('pushConnect: 31');
						clearTimeout(this.reconnectTimeout);
						this.reconnectTimeout = null;
					}

					console.log('pushConnect: 32');
					this.$store.commit('setPushConnectionActive', false);
					console.log('pushConnect: 33');
					this.pushAutomaticReconnect();
				}, false);
			},

			/**
			 * Close connection to server
			 */
			pushDisconnect (): void {
				console.log('pushDisconnect: 1');

				if (this.eventSource !== null) {
					console.log('pushDisconnect: 2');
					this.eventSource.close();
					this.eventSource = null;

					this.$store.commit('setPushConnectionActive', false);
					console.log('pushDisconnect: 3');
				}
			},

			/**
			 * Sometimes the push message is faster as the result from
			 * the REST API so we do not know yet what execution ID
			 * is currently active. So internally resend the message
			 * a few more times
			 *
			 * @param {Event} event
			 * @param {number} retryAttempts
			 * @returns
			 */
			queuePushMessage (event: Event, retryAttempts: number) {
				this.pushMessageQueue.push({ event, retriesLeft: retryAttempts });

				if (this.retryTimeout === null) {
					this.retryTimeout = setTimeout(this.processWaitingPushMessages, 20);
				}
			},


			/**
			 * Process the push messages which are waiting in the queue
			 */
			processWaitingPushMessages () {
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
			 * @returns {boolean} If message could be processed
			 */
			pushMessageReceived (event: Event, isRetry?: boolean): boolean {
				const retryAttempts = 5;

				let receivedData: IPushData;
				try {
					// @ts-ignore
					receivedData = JSON.parse(event.data);
				} catch (error) {
					return false;
				}

				if (!['testWebhookReceived'].includes(receivedData.type) && isRetry !== true && this.pushMessageQueue.length) {
					// If there are already messages in the queue add the new one that all of them
					// get executed in order
					this.queuePushMessage(event, retryAttempts);
					return false;
				}

				if (['nodeExecuteAfter', 'nodeExecuteBefore'].includes(receivedData.type)) {
					if (this.$store.getters.isActionActive('workflowRunning') === false) {
						// No workflow is running so ignore the messages
						return false;
					}
					const pushData = receivedData.data as IPushDataNodeExecuteBefore;
					if (this.$store.getters.activeExecutionId !== pushData.executionId) {
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
					const pushData = receivedData.data as IPushDataExecutionFinished;

					this.$store.commit('finishActiveExecution', pushData);

					if (this.$store.getters.isActionActive('workflowRunning') === false) {
						// No workflow is running so ignore the messages
						return false;
					}

					if (this.$store.getters.activeExecutionId !== pushData.executionIdActive) {
						// The workflow which did finish execution did either not get started
						// by this session or we do not have the execution id yet.
						if (isRetry !== true) {
							this.queuePushMessage(event, retryAttempts);
						}
						return false;
					}

					const runDataExecuted = pushData.data;

					if (runDataExecuted.finished !== true) {
						// There was a problem with executing the workflow
						let errorMessage = 'There was a problem executing the workflow!';
						if (runDataExecuted.data.resultData.error && runDataExecuted.data.resultData.error.message) {
							errorMessage = `There was a problem executing the workflow:<br /><strong>"${runDataExecuted.data.resultData.error.message}"</strong>`;
						}

						this.$showMessage({
							title: 'Problem executing workflow',
							message: errorMessage,
							type: 'error',
						});
					} else {
						// Workflow did execute without a problem
						this.$showMessage({
							title: 'Workflow got executed',
							message: 'Workflow did get executed successfully!',
							type: 'success',
						});
					}

					// It does not push the runData as it got already pushed with each
					// node that did finish. For that reason copy in here the data
					// which we already have.
					runDataExecuted.data.resultData.runData = this.$store.getters.getWorkflowRunData;

					this.$store.commit('setExecutingNode', null);
					this.$store.commit('setWorkflowExecutionData', runDataExecuted);
					this.$store.commit('removeActiveAction', 'workflowRunning');

					// Set the node execution issues on all the nodes which produced an error so that
					// it can be displayed in the node-view
					this.updateNodesExecutionIssues();
				} else if (receivedData.type === 'executionStarted') {
					const pushData = receivedData.data as IPushDataExecutionStarted;

					const executionData: IExecutionsCurrentSummaryExtended = {
						idActive: pushData.executionId,
						finished: false,
						mode: pushData.mode,
						startedAt: pushData.startedAt,
						retryOf: pushData.retryOf,
						workflowId: pushData.workflowId,
						workflowName: pushData.workflowName,
					};

					this.$store.commit('addActiveExecution', executionData);
				} else if (receivedData.type === 'nodeExecuteAfter') {
					// A node finished to execute. Add its data
					const pushData = receivedData.data as IPushDataNodeExecuteAfter;
					this.$store.commit('addNodeExecutionData', pushData);
				} else if (receivedData.type === 'nodeExecuteBefore') {
					// A node started to be executed. Set it as executing.
					const pushData = receivedData.data as IPushDataNodeExecuteBefore;
					this.$store.commit('setExecutingNode', pushData.nodeName);
				} else if (receivedData.type === 'testWebhookDeleted') {
					// A test-webhook got deleted
					const pushData = receivedData.data as IPushDataTestWebhook;

					if (pushData.workflowId === this.$store.getters.workflowId) {
						this.$store.commit('setExecutionWaitingForWebhook', false);
						this.$store.commit('removeActiveAction', 'workflowRunning');
					}
				} else if (receivedData.type === 'testWebhookReceived') {
					// A test-webhook did get called
					const pushData = receivedData.data as IPushDataTestWebhook;

					if (pushData.workflowId === this.$store.getters.workflowId) {
						this.$store.commit('setExecutionWaitingForWebhook', false);
						this.$store.commit('setActiveExecutionId', pushData.executionId);
					}

					this.processWaitingPushMessages();
				}
				return true;
			},
		},
	});
