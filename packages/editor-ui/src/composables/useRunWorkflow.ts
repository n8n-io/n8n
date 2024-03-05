import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IStartRunData,
	IWorkflowDb,
} from '@/Interface';
import type {
	IDataObject,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IPinData,
	IWorkflowBase,
	Workflow,
	StartNodeData,
} from 'n8n-workflow';
import {
	NodeHelpers,
	NodeConnectionType,
	TelemetryHelpers,
	FORM_TRIGGER_PATH_IDENTIFIER,
} from 'n8n-workflow';

import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

import { FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE } from '@/constants';
import { useTitleChange } from '@/composables/useTitleChange';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { openPopUpWindow } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { useRouter } from 'vue-router';
import { isEmpty } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { get } from 'lodash-es';

export function useRunWorkflow(options: { router: ReturnType<typeof useRouter> }) {
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers({ router: options.router });
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const toast = useToast();
	const { titleSet } = useTitleChange();

	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();

	// Starts to execute a workflow on server
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

	async function runWorkflow(options: {
		destinationNode?: string;
		triggerNode?: string;
		nodeData?: ITaskData;
		source?: string;
	}): Promise<IExecutionPushResponse | undefined> {
		const workflow = workflowHelpers.getCurrentWorkflow();

		if (uiStore.isActionActive('workflowRunning')) {
			return;
		}

		titleSet(workflow.name as string, 'EXECUTING');

		toast.clearAllStickyNotifications();

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

					toast.showMessage({
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
						telemetry.track('Workflow execution preflight failed', {
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

			if (workflowsStore.isNewWorkflow) {
				await workflowHelpers.saveCurrentWorkflow();
			}

			const workflowData = await workflowHelpers.getWorkflowDataToSave();

			const consolidatedData = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				workflowData.pinData,
				workflow,
			);

			const { startNodeNames } = consolidatedData;
			let { runData: newRunData } = consolidatedData;
			let executedNode: string | undefined;
			if (
				startNodeNames.length === 0 &&
				'destinationNode' in options &&
				options.destinationNode !== undefined
			) {
				executedNode = options.destinationNode;
				startNodeNames.push(options.destinationNode);
			} else if ('triggerNode' in options && 'nodeData' in options) {
				startNodeNames.push(
					...workflow.getChildNodes(options.triggerNode as string, NodeConnectionType.Main, 1),
				);
				newRunData = {
					[options.triggerNode as string]: [options.nodeData],
				} as IRunData;
				executedNode = options.triggerNode;
			}

			const startNodes: StartNodeData[] = startNodeNames.map((name) => {
				// Find for each start node the source data
				let sourceData = get(runData, [name, 0, 'source', 0], null);
				if (sourceData === null) {
					const parentNodes = workflow.getParentNodes(name, NodeConnectionType.Main, 1);
					const executeData = workflowHelpers.executeData(
						parentNodes,
						name,
						NodeConnectionType.Main,
						0,
					);
					sourceData = get(executeData, ['source', NodeConnectionType.Main, 0], null);
				}
				return {
					name,
					sourceData,
				};
			});

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
				status: 'running',
				startedAt: new Date(),
				stoppedAt: undefined,
				workflowId: workflow.id,
				executedNode,
				data: {
					resultData: {
						runData: newRunData || {},
						pinData: workflowData.pinData,
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
				} as IWorkflowDb,
			};
			workflowsStore.setWorkflowExecutionData(executionData);
			nodeHelpers.updateNodesExecutionIssues();

			const runWorkflowApiResponse = await runWorkflowApi(startRunData);
			const pinData = workflowData.pinData ?? {};

			for (const node of workflowData.nodes) {
				if (pinData[node.name]) continue;

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
			toast.showError(error, i18n.baseText('workflowRun.showError.title'));
			return undefined;
		}
	}

	function consolidateRunDataAndStartNodes(
		directParentNodes: string[],
		runData: IRunData | null,
		pinData: IPinData | undefined,
		workflow: Workflow,
	): { runData: IRunData | undefined; startNodeNames: string[] } {
		const startNodeNames: string[] = [];
		let newRunData: IRunData | undefined;

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
					if (!runData[parentNode]?.length && !pinData?.[parentNode]?.length) {
						// When we hit a node which has no data we stop and set it
						// as a start node the execution from and then go on with other
						// direct input nodes
						startNodeNames.push(parentNode);
						break;
					}
					if (runData[parentNode]) {
						newRunData[parentNode] = runData[parentNode]?.slice(0, 1);
					}
				}
			}

			if (isEmpty(newRunData)) {
				// If there is no data for any of the parent nodes make sure
				// that run data is empty that it runs regularly
				newRunData = undefined;
			}
		}

		return { runData: newRunData, startNodeNames };
	}

	return {
		consolidateRunDataAndStartNodes,
		runWorkflow,
		runWorkflowApi,
	};
}
