import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsStopData,
	IStartRunData,
	IWorkflowDb,
} from '@/Interface';

import type {
	IRunData,
	IRunExecutionData,
	ITaskData,
	IPinData,
	Workflow,
	StartNodeData,
	INode,
	IDataObject,
	IWorkflowBase,
} from 'n8n-workflow';
import { NodeConnectionTypes, TelemetryHelpers } from 'n8n-workflow';
import { retry } from '@n8n/utils/retry';

import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

import {
	CHAT_TRIGGER_NODE_TYPE,
	IN_PROGRESS_EXECUTION_ID,
	SINGLE_WEBHOOK_TRIGGERS,
} from '@/constants';

import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { displayForm } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { useRouter } from 'vue-router';
import { isEmpty } from '@/utils/typesUtils';
import { useI18n } from '@n8n/i18n';
import get from 'lodash/get';
import { useExecutionsStore } from '@/stores/executions.store';
import { useTelemetry } from './useTelemetry';
import { useSettingsStore } from '@/stores/settings.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { useCanvasOperations } from './useCanvasOperations';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { useWorkflowSaving } from './useWorkflowSaving';
import { computed } from 'vue';
import { injectWorkflowState } from './useWorkflowState';
import { useDocumentTitle } from './useDocumentTitle';

export function useRunWorkflow(useRunWorkflowOpts: { router: ReturnType<typeof useRouter> }) {
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers();
	const workflowSaving = useWorkflowSaving({ router: useRunWorkflowOpts.router });
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const settingsStore = useSettingsStore();
	const agentRequestStore = useAgentRequestStore();

	const rootStore = useRootStore();
	const pushConnectionStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const executionsStore = useExecutionsStore();
	const { dirtinessByName } = useNodeDirtiness();
	const { startChat } = useCanvasOperations();

	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

	function sortNodesByYPosition(nodes: string[]) {
		return [...nodes].sort((a, b) => {
			const nodeA = workflowsStore.getNodeByName(a)?.position ?? [0, 0];
			const nodeB = workflowsStore.getNodeByName(b)?.position ?? [0, 0];

			const nodeAYPosition = nodeA[1];
			const nodeBYPosition = nodeB[1];

			if (nodeAYPosition === nodeBYPosition) return 0;

			return nodeAYPosition > nodeBYPosition ? 1 : -1;
		});
	}

	// Starts to execute a workflow on server
	async function runWorkflowApi(runData: IStartRunData): Promise<IExecutionPushResponse> {
		if (!pushConnectionStore.isConnected) {
			// Do not start if the connection to server is not active
			// because then it can not receive the data as it executes.
			throw new Error(i18n.baseText('workflowRun.noActiveConnectionToTheServer'));
		}

		workflowsStore.subWorkflowExecutionError = null;

		// Set the execution as started, but still waiting for the execution to be retrieved
		workflowState.setActiveExecutionId(null);

		let response: IExecutionPushResponse;
		try {
			response = await workflowsStore.runWorkflow(runData);
		} catch (error) {
			workflowState.setActiveExecutionId(undefined);
			throw error;
		}

		const workflowExecutionIdIsNew = workflowsStore.previousExecutionId !== response.executionId;
		const workflowExecutionIdIsPending = workflowsStore.activeExecutionId === null;
		if (response.executionId && workflowExecutionIdIsNew && workflowExecutionIdIsPending) {
			workflowState.setActiveExecutionId(response.executionId);
		}

		if (response.waitingForWebhook === true && workflowsStore.nodesIssuesExist) {
			workflowState.setActiveExecutionId(undefined);
			throw new Error(i18n.baseText('workflowRun.showError.resolveOutstandingIssues'));
		}

		if (response.waitingForWebhook === true) {
			workflowsStore.executionWaitingForWebhook = true;
		}

		return response;
	}

	async function runWorkflow(options: {
		destinationNode?: string;
		triggerNode?: string;
		rerunTriggerNode?: boolean;
		nodeData?: ITaskData;
		source?: string;
	}): Promise<IExecutionPushResponse | undefined> {
		if (workflowsStore.activeExecutionId) {
			return;
		}

		toast.clearAllStickyNotifications();

		try {
			// Get the direct parents of the node
			let directParentNodes: string[] = [];
			if (options.destinationNode !== undefined) {
				directParentNodes = workflowObject.value.getParentNodes(
					options.destinationNode,
					NodeConnectionTypes.Main,
					-1,
				);
			}

			const runData = workflowsStore.getWorkflowRunData;

			if (workflowsStore.isNewWorkflow) {
				await workflowSaving.saveCurrentWorkflow();
			}

			const workflowData = await workflowHelpers.getWorkflowDataToSave();

			const consolidatedData = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				workflowData.pinData,
				workflowObject.value,
			);

			const { startNodeNames } = consolidatedData;
			const destinationNodeType = options.destinationNode
				? workflowsStore.getNodeByName(options.destinationNode)?.type
				: '';

			let executedNode: string | undefined;
			let triggerToStartFrom: IStartRunData['triggerToStartFrom'];
			if (
				startNodeNames.length === 0 &&
				directParentNodes.length === 0 &&
				'destinationNode' in options &&
				options.destinationNode !== undefined
			) {
				executedNode = options.destinationNode;
				startNodeNames.push(options.destinationNode);
			} else if (options.triggerNode && options.nodeData && !options.rerunTriggerNode) {
				// starts execution from downstream nodes of trigger node
				startNodeNames.push(
					...workflowObject.value.getChildNodes(options.triggerNode, NodeConnectionTypes.Main, 1),
				);
			} else if (options.destinationNode) {
				executedNode = options.destinationNode;
			}

			if (options.triggerNode) {
				triggerToStartFrom = {
					name: options.triggerNode,
					data: options.nodeData,
				};
			}

			// If the destination node is specified, check if it is a chat node or has a chat parent
			if (
				options.destinationNode &&
				(workflowsStore.checkIfNodeHasChatParent(options.destinationNode) ||
					destinationNodeType === CHAT_TRIGGER_NODE_TYPE) &&
				options.source !== 'RunData.ManualChatMessage'
			) {
				const startNode = workflowObject.value.getStartNode(options.destinationNode);
				if (startNode && startNode.type === CHAT_TRIGGER_NODE_TYPE) {
					// Check if the chat node has input data or pin data
					const chatHasInputData =
						nodeHelpers.getNodeInputData(startNode, 0, 0, 'input')?.length > 0;
					const chatHasPinData = !!workflowData.pinData?.[startNode.name];

					// If the chat node has no input data or pin data, open the chat modal
					// and halt the execution
					if (!chatHasInputData && !chatHasPinData) {
						workflowsStore.chatPartialExecutionDestinationNode = options.destinationNode;
						startChat();
						return;
					}
				}
			}

			const triggers = workflowData.nodes.filter(
				(node) => node.type.toLowerCase().includes('trigger') && !node.disabled,
			);

			//if no destination node is specified
			//and execution is not triggered from chat
			//and there are other triggers in the workflow
			//disable chat trigger node to avoid modal opening and webhook creation
			if (
				!options.destinationNode &&
				options.source !== 'RunData.ManualChatMessage' &&
				workflowData.nodes.some((node) => node.type === CHAT_TRIGGER_NODE_TYPE)
			) {
				const otherTriggers = triggers.filter((node) => node.type !== CHAT_TRIGGER_NODE_TYPE);

				if (otherTriggers.length) {
					const chatTriggerNode = workflowData.nodes.find(
						(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
					);
					if (chatTriggerNode) {
						chatTriggerNode.disabled = true;
					}
				}
			}

			// partial executions must have a destination node
			const isPartialExecution = options.destinationNode !== undefined;

			// TODO: this will be redundant once we cleanup the partial execution v1
			const startNodes: StartNodeData[] = sortNodesByYPosition(startNodeNames)
				.map((name) => {
					// Find for each start node the source data
					let sourceData = get(runData, [name, 0, 'source', 0], null);
					if (sourceData === null) {
						const parentNodes = workflowObject.value.getParentNodes(
							name,
							NodeConnectionTypes.Main,
							1,
						);
						const executeData = workflowHelpers.executeData(
							workflowObject.value.connectionsBySourceNode,
							parentNodes,
							name,
							NodeConnectionTypes.Main,
							0,
						);
						sourceData = get(executeData, ['source', NodeConnectionTypes.Main, 0], null);
					}
					return {
						name,
						sourceData,
					};
				})
				// If a destination node is specified and it has chat parent, we don't want to include it in the start nodes
				.filter((node) => {
					if (
						options.destinationNode &&
						workflowsStore.checkIfNodeHasChatParent(options.destinationNode)
					) {
						return node.name !== options.destinationNode;
					}
					return true;
				});

			const singleWebhookTrigger =
				options.triggerNode === undefined
					? // if there is no chosen trigger we check all triggers
						triggers.find((node) => SINGLE_WEBHOOK_TRIGGERS.includes(node.type))
					: // if there is a chosen trigger we check this one only
						workflowData.nodes.find(
							(node) =>
								node.name === options.triggerNode && SINGLE_WEBHOOK_TRIGGERS.includes(node.type),
						);

			if (
				singleWebhookTrigger &&
				workflowsStore.isWorkflowActive &&
				!workflowData.pinData?.[singleWebhookTrigger.name]
			) {
				toast.showMessage({
					title: i18n.baseText('workflowRun.showError.deactivate'),
					message: i18n.baseText('workflowRun.showError.productionActive', {
						interpolate: { nodeName: singleWebhookTrigger.name },
					}),
					type: 'error',
				});
				return undefined;
			}

			const startRunData: IStartRunData = {
				workflowData,
				runData: isPartialExecution
					? (runData ?? undefined) // For partial execution, backend decides what run data to use and what to ignore.
					: undefined, // if it's a full execution we don't want to send any run data
				startNodes,
				triggerToStartFrom,
			};

			if ('destinationNode' in options) {
				startRunData.destinationNode = options.destinationNode;
				const nodeId = workflowsStore.getNodeByName(options.destinationNode as string)?.id;
				if (workflowObject.value.id && nodeId) {
					const agentRequest = agentRequestStore.getAgentRequest(workflowObject.value.id, nodeId);

					if (agentRequest) {
						startRunData.agentRequest = {
							query: agentRequest.query ?? {},
							tool: {
								name: agentRequest.toolName ?? '',
							},
						};
					}
				}
			}

			if (startRunData.runData) {
				const nodeNames = Object.entries(dirtinessByName.value).flatMap(([nodeName, dirtiness]) =>
					dirtiness ? [nodeName] : [],
				);

				startRunData.dirtyNodeNames = nodeNames.length > 0 ? nodeNames : undefined;
			}

			// Init the execution data to represent the start of the execution
			// that data which gets reused is already set and data of newly executed
			// nodes can be added as it gets pushed in
			const executionData: IExecutionResponse = {
				id: IN_PROGRESS_EXECUTION_ID,
				finished: false,
				mode: 'manual',
				status: 'running',
				createdAt: new Date(),
				startedAt: new Date(),
				stoppedAt: undefined,
				workflowId: workflowObject.value.id,
				executedNode,
				triggerNode: triggerToStartFrom?.name,
				data: {
					resultData: {
						runData: startRunData.runData ?? {},
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
			workflowState.setWorkflowExecutionData(executionData);
			nodeHelpers.updateNodesExecutionIssues();

			useDocumentTitle().setDocumentTitle(workflowObject.value.name as string, 'EXECUTING');
			const runWorkflowApiResponse = await runWorkflowApi(startRunData);
			const pinData = workflowData.pinData ?? {};

			const getTestUrl = (() => {
				return (node: INode) => {
					const path =
						node.parameters.path ||
						(node.parameters.options as IDataObject)?.path ||
						node.webhookId;
					return `${rootStore.formTestUrl}/${path as string}`;
				};
			})();

			try {
				await displayForm({
					nodes: workflowData.nodes,
					runData: workflowsStore.getWorkflowExecution?.data?.resultData?.runData,
					destinationNode: options.destinationNode,
					triggerNode: options.triggerNode,
					pinData,
					directParentNodes,
					source: options.source,
					getTestUrl,
				});
			} catch (error) {}

			await externalHooks.run('workflowRun.runWorkflow', {
				nodeName: options.destinationNode,
				source: options.source,
			});

			return runWorkflowApiResponse;
		} catch (error) {
			workflowState.setWorkflowExecutionData(null);
			useDocumentTitle().setDocumentTitle(workflowObject.value.name as string, 'ERROR');
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
				const parentNodes = workflow.getParentNodes(directParentNode, NodeConnectionTypes.Main);

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
		let stopData: IExecutionsStopData | undefined;

		if (!executionId) {
			return;
		}

		try {
			stopData = await executionsStore.stopCurrentExecution(executionId);
		} catch (error) {
			// Execution stop might fail when the execution has already finished. Let's treat this here.
			const execution = await workflowsStore.getExecution(executionId);

			if (execution === undefined) {
				// execution finished but was not saved (e.g. due to low connectivity)
				toast.showMessage({
					title: i18n.baseText('nodeView.showMessage.stopExecutionCatch.unsaved.title'),
					message: i18n.baseText('nodeView.showMessage.stopExecutionCatch.unsaved.message'),
					type: 'success',
				});
			} else if (execution?.finished) {
				// execution finished before it could be stopped
				const executedData = {
					data: execution.data,
					workflowData: workflowsStore.workflow,
					finished: execution.finished,
					mode: execution.mode,
					startedAt: execution.startedAt,
					stoppedAt: execution.stoppedAt,
				} as IExecutionResponse;
				workflowState.setWorkflowExecutionData(executedData);
				toast.showMessage({
					title: i18n.baseText('nodeView.showMessage.stopExecutionCatch.title'),
					message: i18n.baseText('nodeView.showMessage.stopExecutionCatch.message'),
					type: 'success',
				});
			} else {
				toast.showError(error, i18n.baseText('nodeView.showError.stopExecution.title'));
			}
		} finally {
			// Wait for websocket event to update the execution status to 'canceled'
			const markedAsStopped = await retry(
				async () => {
					const execution = await workflowsStore.getExecution(executionId);
					if (!['running', 'waiting'].includes(execution?.status as string)) {
						workflowState.markExecutionAsStopped(stopData);
						return true;
					}

					return false;
				},
				250,
				20,
			);

			if (!markedAsStopped) {
				workflowState.markExecutionAsStopped(stopData);
			}
		}
	}

	async function stopWaitingForWebhook() {
		try {
			await workflowsStore.removeTestWebhook(workflowsStore.workflowId);
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.stopWaitingForWebhook.title'));
			return;
		}
	}

	async function runEntireWorkflow(source: 'node' | 'main', triggerNode?: string) {
		void workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
			const telemetryPayload = {
				workflow_id: workflowObject.value.id,
				node_graph_string: JSON.stringify(
					TelemetryHelpers.generateNodesGraph(
						workflowData as IWorkflowBase,
						workflowHelpers.getNodeTypes(),
						{ isCloudDeployment: settingsStore.isCloudDeployment },
					).nodeGraph,
				),
				button_type: source,
			};
			telemetry.track('User clicked execute workflow button', telemetryPayload);
			void externalHooks.run('nodeView.onRunWorkflow', telemetryPayload);
		});

		void runWorkflow({
			triggerNode: triggerNode ?? workflowsStore.selectedTriggerNodeName,
		});
	}

	return {
		consolidateRunDataAndStartNodes,
		runEntireWorkflow,
		runWorkflow,
		runWorkflowApi,
		stopCurrentExecution,
		stopWaitingForWebhook,
		sortNodesByYPosition,
	};
}
