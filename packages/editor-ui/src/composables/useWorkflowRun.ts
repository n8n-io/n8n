import type { IExecutionPushResponse, IExecutionResponse, IStartRunData } from '@/Interface';

import type {
	IDataObject,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
} from 'n8n-workflow';
import {
	NodeHelpers,
	NodeConnectionType,
	TelemetryHelpers,
	FORM_TRIGGER_PATH_IDENTIFIER,
} from 'n8n-workflow';
import { getCurrentInstance } from 'vue';
import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

import { FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE } from '@/constants';
import { useTitleChange } from '@/composables/useTitleChange';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { openPopUpWindow } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from './useWorkflowHelpers';
import { useTelemetry } from './useTelemetry';
import { useI18n } from './useI18n';

export function useWorkflowRun() {
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const i18n = useI18n();
	const instance = getCurrentInstance();

	// Starts to executes a workflow on server.
	async function runWorkflowApi(runData: IStartRunData): Promise<IExecutionPushResponse> {
		if (!rootStore.pushConnectionActive) {
			// Do not start if the connection to server is not active
			// because then it can not receive the data as it executes.
			throw new Error(i18n.baseText('workflowRun.noActiveConnectionToTheServer'));
		}

		workflowsStore.subWorkflowExecutionError = null;

		uiStore.addActiveAction('workflowRunning');

		let response: IExecutionPushResponse;

		try {
			response = await workflowsStore.runWorkflow(runData);
		} catch (error) {
			uiStore.removeActiveAction('workflowRunning');
			throw error;
		}

		if (response.executionId !== undefined) {
			workflowsStore.activeExecutionId = response.executionId;
		}

		if (response.waitingForWebhook === true) {
			workflowsStore.executionWaitingForWebhook = true;
		}

		return response;
	}

	async function runWorkflow(
		options:
			| { destinationNode: string; source?: string }
			| { triggerNode: string; nodeData: ITaskData; source?: string }
			| { source?: string },
	): Promise<IExecutionPushResponse | undefined> {
		const workflowHelpers = useWorkflowHelpers(instance ?? undefined);
		const workflow = workflowHelpers.getCurrentWorkflow();
		const { clearAllStickyNotifications, showMessage } = useToast();
		const { titleSet } = useTitleChange();

		if (uiStore.isActionActive('workflowRunning')) {
			return;
		}

		titleSet(workflow.name as string, 'EXECUTING');

		clearAllStickyNotifications();

		try {
			// Check first if the workflow has any issues before execute it
			nodeHelpers.refreshNodeIssues();
			const issuesExist = workflowsStore.nodesIssuesExist;
			if (issuesExist) {
				// If issues exist get all of the issues of all nodes
				const workflowIssues = workflowHelpers.checkReadyForExecution(
					workflow,
					options.destinationNode,
				);
				if (workflowIssues !== null) {
					const errorMessages = [];
					let nodeIssues: string[];
					const trackNodeIssues: Array<{
						node_type: string;
						error: string;
					}> = [];
					const trackErrorNodeTypes: string[] = [];
					for (const nodeName of Object.keys(workflowIssues)) {
						nodeIssues = NodeHelpers.nodeIssuesToString(workflowIssues[nodeName]);
						let issueNodeType = 'UNKNOWN';
						const issueNode = workflowsStore.getNodeByName(nodeName);

						if (issueNode) {
							issueNodeType = issueNode.type;
						}

						trackErrorNodeTypes.push(issueNodeType);
						const trackNodeIssue = {
							node_type: issueNodeType,
							error: '',
							caused_by_credential: !!workflowIssues[nodeName].credentials,
						};

						for (const nodeIssue of nodeIssues) {
							errorMessages.push(
								`<a data-action='openNodeDetail' data-action-parameter-node='${nodeName}'>${nodeName}</a>: ${nodeIssue}`,
							);
							trackNodeIssue.error = trackNodeIssue.error.concat(', ', nodeIssue);
						}
						trackNodeIssues.push(trackNodeIssue);
					}

					showMessage({
						title: i18n.baseText('workflowRun.showMessage.title'),
						message: errorMessages.join('<br />'),
						type: 'error',
						duration: 0,
					});
					titleSet(workflow.name as string, 'ERROR');
					void useExternalHooks().run('workflowRun.runError', {
						errorMessages,
						nodeName: options.destinationNode,
					});

					await workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
						useTelemetry().track('Workflow execution preflight failed', {
							workflow_id: workflow.id,
							workflow_name: workflow.name,
							execution_type: options.destinationNode || options.triggerNode ? 'node' : 'workflow',
							node_graph_string: JSON.stringify(
								TelemetryHelpers.generateNodesGraph(
									workflowData as IWorkflowBase,
									workflowHelpers.getNodeTypes(),
								).nodeGraph,
							),
							error_node_types: JSON.stringify(trackErrorNodeTypes),
							errors: JSON.stringify(trackNodeIssues),
						});
					});
					return;
				}
			}

			// Get the direct parents of the node
			let directParentNodes: string[] = [];
			if (options.destinationNode !== undefined) {
				directParentNodes = workflow.getParentNodes(
					options.destinationNode,
					NodeConnectionType.Main,
					1,
				);
			}

			const runData = workflowsStore.getWorkflowRunData;

			let newRunData: IRunData | undefined;

			const startNodes: string[] = [];

			if (runData !== null && Object.keys(runData).length !== 0) {
				newRunData = {};

				// Go over the direct parents of the node
				for (const directParentNode of directParentNodes) {
					// Go over the parents of that node so that we can get a start
					// node for each of the branches
					const parentNodes = workflow.getParentNodes(directParentNode, NodeConnectionType.Main);

					// Add also the enabled direct parent to be checked
					if (workflow.nodes[directParentNode].disabled) continue;

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

			let executedNode: string | undefined;
			if (
				startNodes.length === 0 &&
				'destinationNode' in options &&
				options.destinationNode !== undefined
			) {
				executedNode = options.destinationNode;
				startNodes.push(options.destinationNode);
			} else if ('triggerNode' in options && 'nodeData' in options) {
				startNodes.push(...workflow.getChildNodes(options.triggerNode, NodeConnectionType.Main, 1));
				newRunData = {
					[options.triggerNode]: [options.nodeData],
				};
				executedNode = options.triggerNode;
			}

			if (workflowsStore.isNewWorkflow) {
				await workflowHelpers.saveCurrentWorkflow();
			}

			const workflowData = await workflowHelpers.getWorkflowDataToSave();

			const startRunData: IStartRunData = {
				workflowData,
				runData: newRunData,
				pinData: workflowData.pinData,
				startNodes,
			};
			if ('destinationNode' in options) {
				startRunData.destinationNode = options.destinationNode;
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
				executedNode,
				data: {
					resultData: {
						runData: newRunData || {},
						pinData: workflowData.pinData,
						startNodes,
						workflowData,
					},
				} as IRunExecutionData,
				workflowData: {
					id: workflowsStore.workflowId,
					name: workflowData.name!,
					active: workflowData.active!,
					createdAt: 0,
					updatedAt: 0,
					...workflowData,
				},
			};
			workflowsStore.setWorkflowExecutionData(executionData);
			nodeHelpers.updateNodesExecutionIssues();

			const runWorkflowApiResponse = await runWorkflowApi(startRunData);

			for (const node of workflowData.nodes) {
				if (![FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE].includes(node.type)) {
					continue;
				}

				if (
					options.destinationNode &&
					options.destinationNode !== node.name &&
					!directParentNodes.includes(node.name)
				) {
					continue;
				}

				if (node.name === options.destinationNode || !node.disabled) {
					let testUrl = '';

					if (node.type === FORM_TRIGGER_NODE_TYPE && node.typeVersion === 1) {
						const webhookPath = (node.parameters.path as string) || node.webhookId;
						testUrl = `${rootStore.getWebhookTestUrl}/${webhookPath}/${FORM_TRIGGER_PATH_IDENTIFIER}`;
					}

					if (node.type === FORM_TRIGGER_NODE_TYPE && node.typeVersion > 1) {
						const webhookPath = (node.parameters.path as string) || node.webhookId;
						testUrl = `${rootStore.getFormTestUrl}/${webhookPath}`;
					}

					if (
						node.type === WAIT_NODE_TYPE &&
						node.parameters.resume === 'form' &&
						runWorkflowApiResponse.executionId
					) {
						const workflowTriggerNodes = workflow.getTriggerNodes().map((node) => node.name);

						const showForm =
							options.destinationNode === node.name ||
							directParentNodes.includes(node.name) ||
							workflowTriggerNodes.some((triggerNode) =>
								workflowsStore.isNodeInOutgoingNodeConnections(triggerNode, node.name),
							);

						if (!showForm) continue;

						const { webhookSuffix } = (node.parameters.options || {}) as IDataObject;
						const suffix = webhookSuffix ? `/${webhookSuffix}` : '';
						testUrl = `${rootStore.getFormWaitingUrl}/${runWorkflowApiResponse.executionId}${suffix}`;
					}

					if (testUrl) openPopUpWindow(testUrl);
				}
			}

			await useExternalHooks().run('workflowRun.runWorkflow', {
				nodeName: options.destinationNode,
				source: options.source,
			});

			return runWorkflowApiResponse;
		} catch (error) {
			titleSet(workflow.name as string, 'ERROR');
			useToast().showError(error, i18n.baseText('workflowRun.showError.title'));
			return undefined;
		}
	}
	return {
		runWorkflowApi,
		runWorkflow,
	};
}
