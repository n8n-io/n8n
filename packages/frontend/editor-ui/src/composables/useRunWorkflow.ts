import type {
	IExecutionPushResponse,
	IExecutionResponse,
	INodeUi,
	IStartRunData,
	IWorkflowDb,
} from '@/Interface';

import type {
	IRunExecutionData,
	ITaskData,
	Workflow,
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
import { useI18n } from '@n8n/i18n';
import { useExecutionsStore } from '@/stores/executions.store';
import { useTelemetry } from './useTelemetry';
import { useSettingsStore } from '@/stores/settings.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { useCanvasOperations } from './useCanvasOperations';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { useWorkflowSaving } from './useWorkflowSaving';
import { computed } from 'vue';
import type { WorkflowData } from '@n8n/rest-api-client';

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
	const executionsStore = useExecutionsStore();
	const { dirtinessByName } = useNodeDirtiness();
	const { startChat } = useCanvasOperations();

	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

	// Starts to execute a workflow on server
	async function runWorkflowApi(runData: IStartRunData): Promise<IExecutionPushResponse> {
		if (!pushConnectionStore.isConnected) {
			// Do not start if the connection to server is not active
			// because then it can not receive the data as it executes.
			throw new Error(i18n.baseText('workflowRun.noActiveConnectionToTheServer'));
		}

		workflowsStore.subWorkflowExecutionError = null;

		// Set the execution as started, but still waiting for the execution to be retrieved
		workflowsStore.setActiveExecutionId(null);

		let response: IExecutionPushResponse;
		try {
			response = await workflowsStore.runWorkflow(runData);
		} catch (error) {
			workflowsStore.setActiveExecutionId(undefined);
			throw error;
		}

		const workflowExecutionIdIsNew = workflowsStore.previousExecutionId !== response.executionId;
		const workflowExecutionIdIsPending = workflowsStore.activeExecutionId === null;
		if (response.executionId && workflowExecutionIdIsNew && workflowExecutionIdIsPending) {
			workflowsStore.setActiveExecutionId(response.executionId);
		}

		if (response.waitingForWebhook === true && workflowsStore.nodesIssuesExist) {
			workflowsStore.setActiveExecutionId(undefined);
			throw new Error(i18n.baseText('workflowRun.showError.resolveOutstandingIssues'));
		}

		if (response.waitingForWebhook === true) {
			workflowsStore.executionWaitingForWebhook = true;
		}

		return response;
	}

	function findChatTriggerToOpen(
		destinationNode: INodeUi,
		workflowData: WorkflowData,
	): INodeUi | undefined {
		const chatToOpen =
			workflowsStore.findChatParent(destinationNode.name) ??
			(destinationNode && destinationNode.type === CHAT_TRIGGER_NODE_TYPE
				? destinationNode
				: undefined);

		if (!chatToOpen) {
			return undefined;
		}

		// Check if the chat node has input data
		if ((nodeHelpers.getNodeInputData(chatToOpen, 0, 0, 'input') ?? []).length > 0) {
			return undefined;
		}

		// Check if the chat node has pin data
		if (workflowData.pinData?.[chatToOpen.name]) {
			return undefined;
		}

		return chatToOpen;
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

			const destinationNode = options.destinationNode
				? workflowsStore.getNodeByName(options.destinationNode)
				: undefined;
			const executedNode =
				options.destinationNode ??
				(options.triggerNode && options.nodeData && !options.rerunTriggerNode
					? options.triggerNode
					: undefined);
			const triggerToStartFrom = options.triggerNode
				? { name: options.triggerNode, data: options.nodeData }
				: undefined;

			// If the destination node is specified, check if chat modal should open and halt execution
			const chatToOpen =
				options.source === 'RunData.ManualChatMessage' && destinationNode
					? findChatTriggerToOpen(destinationNode, workflowData)
					: undefined;

			if (chatToOpen) {
				workflowsStore.chatPartialExecutionDestinationNode = options.destinationNode ?? null;
				startChat();
				return;
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
				// With the new partial execution version the backend decides what run
				// data to use and what to ignore.
				runData: !isPartialExecution
					? // if it's a full execution we don't want to send any run data
						undefined
					: (runData ?? undefined),
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
			workflowsStore.setWorkflowExecutionData(executionData);
			nodeHelpers.updateNodesExecutionIssues();

			workflowHelpers.setDocumentTitle(workflowObject.value.name as string, 'EXECUTING');
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
			workflowsStore.setWorkflowExecutionData(null);
			workflowHelpers.setDocumentTitle(workflowObject.value.name as string, 'ERROR');
			toast.showError(error, i18n.baseText('workflowRun.showError.title'));
			return undefined;
		}
	}

	async function stopCurrentExecution() {
		const executionId = workflowsStore.activeExecutionId;
		if (!executionId) {
			return;
		}

		try {
			await executionsStore.stopCurrentExecution(executionId);
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
				workflowsStore.setWorkflowExecutionData(executedData);
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
						workflowsStore.markExecutionAsStopped();
						return true;
					}

					return false;
				},
				250,
				20,
			);

			if (!markedAsStopped) {
				workflowsStore.markExecutionAsStopped();
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
		runEntireWorkflow,
		runWorkflow,
		runWorkflowApi,
		stopCurrentExecution,
		stopWaitingForWebhook,
	};
}
