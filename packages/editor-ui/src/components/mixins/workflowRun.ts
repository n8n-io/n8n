import {
	IExecutionPushResponse,
	IExecutionResponse,
	IStartRunData,
} from '@/Interface';

import {
	IRunData,
	IRunExecutionData,
	NodeHelpers,
} from 'n8n-workflow';

import { restApi } from '@/components/mixins/restApi';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';
import { titleChange } from './titleChange';

export const workflowRun = mixins(
	restApi,
	workflowHelpers,
	titleChange,
).extend({
	methods: {
		// Starts to executes a workflow on server.
		async runWorkflowApi (runData: IStartRunData): Promise<IExecutionPushResponse> {
			if (this.$store.getters.pushConnectionActive === false) {
				// Do not start if the connection to server is not active
				// because then it can not receive the data as it executes.
				throw new Error('No active connection to server. It is maybe down.');
			}
			const workflow = this.getWorkflow();

			this.$store.commit('addActiveAction', 'workflowRunning');

			let response: IExecutionPushResponse;

			try {
				response = await this.restApi().runWorkflow(runData);
			} catch (error) {
				this.$store.commit('removeActiveAction', 'workflowRunning');
				throw error;
			}

			if (response.executionId !== undefined) {
				this.$store.commit('setActiveExecutionId', response.executionId);
			}

			if (response.waitingForWebhook === true) {
				this.$store.commit('setExecutionWaitingForWebhook', true);
			}

			return response;
		},
		async runWorkflow (nodeName: string): Promise<IExecutionPushResponse | undefined> {
			if (this.$store.getters.isActionActive('workflowRunning') === true) {
				return;
			}

			const workflow = this.getWorkflow();
			this.$titleSet(workflow.name as string, 'EXECUTING');

			try {
				// Check first if the workflow has any issues before execute it
				const issuesExist = this.$store.getters.nodesIssuesExist;
				if (issuesExist === true) {
					// If issues exist get all of the issues of all nodes
					const workflowIssues = this.checkReadyForExecution(workflow);
					if (workflowIssues !== null) {
						const errorMessages = [];
						let nodeIssues: string[];
						for (const nodeName of Object.keys(workflowIssues)) {
							nodeIssues = NodeHelpers.nodeIssuesToString(workflowIssues[nodeName]);
							for (const nodeIssue of nodeIssues) {
								errorMessages.push(`${nodeName}: ${nodeIssue}`);
							}
						}

						this.$showMessage({
							title: 'Workflow can not be executed',
							message: 'The workflow has issues. Please fix them first:<br />&nbsp;&nbsp;- ' + errorMessages.join('<br />&nbsp;&nbsp;- '),
							type: 'error',
							duration: 0,
						});
						this.$titleSet(workflow.name as string, 'ERROR');
						return;
					}
				}

				// Get the direct parents of the node
				const directParentNodes = workflow.getParentNodes(nodeName, 'main', 1);

				const runData = this.$store.getters.getWorkflowRunData;

				let newRunData: IRunData | undefined;

				const startNodes: string[] = [];

				if (runData !== null && Object.keys(runData).length !== 0) {
					newRunData = {};

					// Go over the direct parents of the node
					for (const directParentNode of directParentNodes) {
						// Go over the parents of that node so that we can get a start
						// node for each of the branches
						const parentNodes = workflow.getParentNodes(directParentNode, 'main');

						// Add also the direct parent to be checked
						parentNodes.push(directParentNode);

						for (const parentNode of parentNodes) {
							if (runData[parentNode] === undefined || runData[parentNode].length === 0) {
								// When we hit a node which has no data we stop and set it
								// as a start node the execution from and then go on with other
								// direct input nodes
								startNodes.push(parentNode);
								break;
							}
							newRunData[parentNode] = runData[parentNode].slice(0, 1);
						}
					}

					if (Object.keys(newRunData).length === 0) {
						// If there is no data for any of the parent nodes make sure
						// that run data is empty that it runs regularly
						newRunData = undefined;
					}
				}

				if (startNodes.length === 0) {
					startNodes.push(nodeName);
				}

				const workflowData = await this.getWorkflowDataToSave();

				const startRunData: IStartRunData = {
					workflowData,
					runData: newRunData,
					startNodes,
				};
				if (nodeName) {
					startRunData.destinationNode = nodeName;
				}

				// Init the execution data to represent the start of the execution
				// that data which gets reused is already set and data of newly executed
				// nodes can be added as it gets pushed in
				const executionData: IExecutionResponse = {
					id: '__IN_PROGRESS__',
					finished: false,
					mode: 'manual',
					startedAt: new Date(),
					stoppedAt: undefined,
					workflowId: workflow.id,
					data: {
						resultData: {
							runData: newRunData || {},
							startNodes,
							workflowData,
						},
					} as IRunExecutionData,
					workflowData: {
						id: this.$store.getters.workflowId,
						name: workflowData.name!,
						active: workflowData.active!,
						createdAt: 0,
						updatedAt: 0,
						...workflowData,
					},
				};
				this.$store.commit('setWorkflowExecutionData', executionData);

				 return await this.runWorkflowApi(startRunData);
			} catch (error) {
				this.$titleSet(workflow.name as string, 'ERROR');
				this.$showError(error, 'Problem running workflow', 'There was a problem running the workflow:');
				return undefined;
			}
		},
	},
});
