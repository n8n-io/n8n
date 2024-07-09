import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IPushDataExecutionFinished,
	IStartRunData,
	IWorkflowDb,
} from '@/Interface';
import type {
	IDataObject,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IPinData,
	Workflow,
	StartNodeData,
	IRun,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';
import { useTitleChange } from '@/composables/useTitleChange';
import { useRootStore } from '@/stores/root.store';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { openPopUpWindow } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { useRouter } from 'vue-router';
import { isEmpty } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { get } from 'lodash-es';
import { useExecutionsStore } from '@/stores/executions.store';

export function useRunWorkflow(useRunWorkflowOpts: { router: ReturnType<typeof useRouter> }) {
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers({ router: useRunWorkflowOpts.router });
	const i18n = useI18n();
	const toast = useToast();
	const { titleSet } = useTitleChange();

	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const executionsStore = useExecutionsStore();

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

		if (uiStore.isActionActive['workflowRunning']) {
			return;
		}

		titleSet(workflow.name as string, 'EXECUTING');

		toast.clearAllStickyNotifications();

		try {
			// Get the direct parents of the node
			let directParentNodes: string[] = [];
			if (options.destinationNode !== undefined) {
				directParentNodes = workflow.getParentNodes(
					options.destinationNode,
					NodeConnectionType.Main,
					-1,
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
			const destinationNodeType = options.destinationNode
				? workflowsStore.getNodeByName(options.destinationNode)?.type
				: '';

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

			// If the destination node is specified, check if it is a chat node or has a chat parent
			if (
				options.destinationNode &&
				(workflowsStore.checkIfNodeHasChatParent(options.destinationNode) ||
					destinationNodeType === CHAT_TRIGGER_NODE_TYPE)
			) {
				const startNode = workflow.getStartNode(options.destinationNode);
				if (startNode && startNode.type === CHAT_TRIGGER_NODE_TYPE) {
					// Check if the chat node has input data or pin data
					const chatHasInputData =
						nodeHelpers.getNodeInputData(startNode, 0, 0, 'input')?.length > 0;
					const chatHasPinData = !!workflowData.pinData?.[startNode.name];

					// If the chat node has no input data or pin data, open the chat modal
					// and halt the execution
					if (!chatHasInputData && !chatHasPinData) {
						uiStore.openModal(WORKFLOW_LM_CHAT_MODAL_KEY);
						return;
					}
				}
			}

			//if no destination node is specified
			//and execution is not triggered from chat
			//and there are other triggers in the workflow
			//disable chat trigger node to avoid modal opening and webhook creation
			if (
				!options.destinationNode &&
				options.source !== 'RunData.ManualChatMessage' &&
				workflowData.nodes.some((node) => node.type === CHAT_TRIGGER_NODE_TYPE)
			) {
				const otherTriggers = workflowData.nodes.filter(
					(node) =>
						node.type !== CHAT_TRIGGER_NODE_TYPE &&
						node.type.toLowerCase().includes('trigger') &&
						!node.disabled,
				);

				if (otherTriggers.length) {
					const chatTriggerNode = workflowData.nodes.find(
						(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
					);
					if (chatTriggerNode) {
						chatTriggerNode.disabled = true;
					}
				}
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
						runData: newRunData ?? {},
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

					const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
					if (nodeType?.webhooks?.length) {
						testUrl = workflowHelpers.getWebhookUrl(nodeType.webhooks[0], node, 'test');
					}

					if (
						node.type === WAIT_NODE_TYPE &&
						node.parameters.resume === 'form' &&
						runWorkflowApiResponse.executionId
					) {
						const workflowTriggerNodes = workflow
							.getTriggerNodes()
							.map((triggerNode) => triggerNode.name);

						const showForm =
							options.destinationNode === node.name ||
							directParentNodes.includes(node.name) ||
							workflowTriggerNodes.some((triggerNode) =>
								workflowsStore.isNodeInOutgoingNodeConnections(triggerNode, node.name),
							);

						if (!showForm) continue;

						const { webhookSuffix } = (node.parameters.options ?? {}) as IDataObject;
						const suffix =
							webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';
						testUrl = `${rootStore.formWaitingUrl}/${runWorkflowApiResponse.executionId}${suffix}`;
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
		const startNodeNames = new Set<string>();
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
					// We want to execute nodes that don't have run data neither pin data
					// in addition, if a node failed we want to execute it again
					if (
						(!runData[parentNode]?.length && !pinData?.[parentNode]?.length) ||
						runData[parentNode]?.[0]?.error !== undefined
					) {
						// When we hit a node which has no data we stop and set it
						// as a start node the execution from and then go on with other
						// direct input nodes
						startNodeNames.add(parentNode);
						break;
					}
					if (runData[parentNode] && !runData[parentNode]?.[0]?.error) {
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

		return { runData: newRunData, startNodeNames: [...startNodeNames] };
	}

	async function stopCurrentExecution() {
		const executionId = workflowsStore.activeExecutionId;
		if (executionId === null) {
			return;
		}

		try {
			await executionsStore.stopCurrentExecution(executionId);
		} catch (error) {
			// Execution stop might fail when the execution has already finished. Let's treat this here.
			const execution = await workflowsStore.getExecution(executionId);

			if (execution === undefined) {
				// execution finished but was not saved (e.g. due to low connectivity)
				workflowsStore.finishActiveExecution({
					executionId,
					data: { finished: true, stoppedAt: new Date() },
				});
				workflowsStore.executingNode.length = 0;
				uiStore.removeActiveAction('workflowRunning');

				titleSet(workflowsStore.workflowName, 'IDLE');
				toast.showMessage({
					title: i18n.baseText('nodeView.showMessage.stopExecutionCatch.unsaved.title'),
					message: i18n.baseText('nodeView.showMessage.stopExecutionCatch.unsaved.message'),
					type: 'success',
				});
			} else if (execution?.finished) {
				// execution finished before it could be stopped
				const executedData = {
					data: execution.data,
					finished: execution.finished,
					mode: execution.mode,
					startedAt: execution.startedAt,
					stoppedAt: execution.stoppedAt,
				} as IRun;
				const pushData = {
					data: executedData,
					executionId,
					retryOf: execution.retryOf,
				} as IPushDataExecutionFinished;
				workflowsStore.finishActiveExecution(pushData);
				titleSet(execution.workflowData.name, 'IDLE');
				workflowsStore.executingNode.length = 0;
				workflowsStore.setWorkflowExecutionData(executedData as IExecutionResponse);
				uiStore.removeActiveAction('workflowRunning');
				toast.showMessage({
					title: i18n.baseText('nodeView.showMessage.stopExecutionCatch.title'),
					message: i18n.baseText('nodeView.showMessage.stopExecutionCatch.message'),
					type: 'success',
				});
			} else {
				toast.showError(error, i18n.baseText('nodeView.showError.stopExecution.title'));
			}
		}
	}

	return {
		consolidateRunDataAndStartNodes,
		runWorkflow,
		runWorkflowApi,
		stopCurrentExecution,
	};
}
