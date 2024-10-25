import type {
	IExecutionPushResponse,
	IExecutionResponse,
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
	IRun,
	INode,
	IDataObject,
} from 'n8n-workflow';

import { FORM_NODE_TYPE, NodeConnectionType } from 'n8n-workflow';

import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
	WORKFLOW_LM_CHAT_MODAL_KEY,
} from '@/constants';

import { useRootStore } from '@/stores/root.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { displayForm, openPopUpWindow } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { useRouter } from 'vue-router';
import { isEmpty } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { get } from 'lodash-es';
import { useExecutionsStore } from '@/stores/executions.store';
import type { PushPayload } from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';

const FORM_RELOAD = 'n8n_redirect_to_next_form_test_page';

export function useRunWorkflow(useRunWorkflowOpts: { router: ReturnType<typeof useRouter> }) {
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers({ router: useRunWorkflowOpts.router });
	const i18n = useI18n();
	const toast = useToast();

	const rootStore = useRootStore();
	const uiStore = useUIStore();
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

		if (response.waitingForWebhook === true && useWorkflowsStore().nodesIssuesExist) {
			uiStore.removeActiveAction('workflowRunning');
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
		nodeData?: ITaskData;
		source?: string;
	}): Promise<IExecutionPushResponse | undefined> {
		const workflow = workflowHelpers.getCurrentWorkflow();

		if (uiStore.isActionActive['workflowRunning']) {
			return;
		}

		workflowHelpers.setDocumentTitle(workflow.name as string, 'EXECUTING');

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

			// -1 means the backend chooses the default
			// 0 is the old flow
			// 1 is the new flow
			const partialExecutionVersion = useLocalStorage('PartialExecution.version', -1);
			const startRunData: IStartRunData = {
				workflowData,
				// With the new partial execution version the backend decides what run
				// data to use and what to ignore.
				runData: partialExecutionVersion.value === 1 ? (runData ?? undefined) : newRunData,
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
				displayForm({
					nodes: workflowData.nodes,
					runData: workflowsStore.getWorkflowExecution?.data?.resultData?.runData,
					destinationNode: options.destinationNode,
					pinData,
					directParentNodes,
					source: options.source,
					getTestUrl,
				});
			} catch (error) {}

			await useExternalHooks().run('workflowRun.runWorkflow', {
				nodeName: options.destinationNode,
				source: options.source,
			});

			return runWorkflowApiResponse;
		} catch (error) {
			workflowHelpers.setDocumentTitle(workflow.name as string, 'ERROR');
			toast.showError(error, i18n.baseText('workflowRun.showError.title'));
			return undefined;
		}
	}

	function getFormResumeUrl(node: INode, executionId: string) {
		const { webhookSuffix } = (node.parameters.options ?? {}) as IDataObject;
		const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';
		const testUrl = `${rootStore.formWaitingUrl}/${executionId}${suffix}`;
		return testUrl;
	}

	async function runWorkflowResolvePending(options: {
		destinationNode?: string;
		triggerNode?: string;
		nodeData?: ITaskData;
		source?: string;
	}): Promise<IExecutionPushResponse | undefined> {
		let runWorkflowApiResponse = await runWorkflow(options);
		let { executionId } = runWorkflowApiResponse || {};

		const MAX_DELAY = 3000;

		const waitForWebhook = async (): Promise<string> => {
			return await new Promise<string>((resolve) => {
				let delay = 300;
				let timeoutId: NodeJS.Timeout | null = null;

				const checkWebhook = async () => {
					await useExternalHooks().run('workflowRun.runWorkflow', {
						nodeName: options.destinationNode,
						source: options.source,
					});

					if (workflowsStore.activeExecutionId) {
						executionId = workflowsStore.activeExecutionId;
						runWorkflowApiResponse = { executionId };

						if (timeoutId) clearTimeout(timeoutId);

						resolve(executionId);
					}

					delay = Math.min(delay * 1.1, MAX_DELAY);
					timeoutId = setTimeout(checkWebhook, delay);
				};
				timeoutId = setTimeout(checkWebhook, delay);
			});
		};

		if (!executionId) executionId = await waitForWebhook();

		let isFormShown =
			!options.destinationNode &&
			workflowsStore.allNodes.some((node) => node.type === FORM_TRIGGER_NODE_TYPE);

		const resolveWaitingNodesData = async (): Promise<void> => {
			return await new Promise<void>((resolve) => {
				let delay = 300;
				let timeoutId: NodeJS.Timeout | null = null;

				const processExecution = async () => {
					await useExternalHooks().run('workflowRun.runWorkflow', {
						nodeName: options.destinationNode,
						source: options.source,
					});
					const execution = await workflowsStore.getExecution((executionId as string) || '');

					localStorage.removeItem(FORM_RELOAD);

					if (!execution || workflowsStore.workflowExecutionData === null) {
						uiStore.removeActiveAction('workflowRunning');
						if (timeoutId) clearTimeout(timeoutId);
						resolve();
						return;
					}

					const { lastNodeExecuted } = execution.data?.resultData || {};
					const lastNode = execution.workflowData.nodes.find((node) => {
						return node.name === lastNodeExecuted;
					});

					if (
						execution.finished ||
						['error', 'canceled', 'crashed', 'success'].includes(execution.status)
					) {
						workflowsStore.setWorkflowExecutionData(execution);
						uiStore.removeActiveAction('workflowRunning');
						workflowsStore.activeExecutionId = null;
						if (timeoutId) clearTimeout(timeoutId);
						resolve();
						return;
					}

					if (execution.status === 'waiting' && execution.data?.waitTill) {
						delete execution.data.resultData.runData[
							execution.data.resultData.lastNodeExecuted as string
						];
						workflowsStore.setWorkflowExecutionRunData(execution.data);

						if (
							lastNode &&
							(lastNode.type === FORM_NODE_TYPE ||
								(lastNode.type === WAIT_NODE_TYPE && lastNode.parameters.resume === 'form'))
						) {
							let testUrl = getFormResumeUrl(lastNode, executionId as string);

							if (isFormShown) {
								localStorage.setItem(FORM_RELOAD, testUrl);
							} else {
								if (options.destinationNode) {
									// Check if the form trigger has starting data
									// if not do not show next form as trigger would redirect to page
									// otherwise there would be duplicate popup
									const formTrigger = execution?.workflowData.nodes.find((node) => {
										return node.type === FORM_TRIGGER_NODE_TYPE;
									});
									const runNodeFilter = execution?.data?.startData?.runNodeFilter || [];
									if (formTrigger && !runNodeFilter.includes(formTrigger.name)) {
										isFormShown = true;
									}
								}
								if (!isFormShown) {
									if (lastNode.type === FORM_NODE_TYPE) {
										testUrl = `${rootStore.formWaitingUrl}/${executionId}`;
									} else {
										testUrl = getFormResumeUrl(lastNode, executionId as string);
									}

									isFormShown = true;
									if (testUrl) openPopUpWindow(testUrl);
								}
							}
						}
					}

					delay = Math.min(delay * 1.1, MAX_DELAY);
					timeoutId = setTimeout(processExecution, delay);
				};
				timeoutId = setTimeout(processExecution, delay);
			});
		};

		await resolveWaitingNodesData();

		return runWorkflowApiResponse;
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
					data: { finished: true, stoppedAt: new Date() } as IRun,
				});
				workflowsStore.executingNode.length = 0;
				uiStore.removeActiveAction('workflowRunning');

				workflowHelpers.setDocumentTitle(workflowsStore.workflowName, 'IDLE');
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
				const pushData: PushPayload<'executionFinished'> = {
					data: executedData,
					executionId,
					retryOf: execution.retryOf,
				};
				workflowsStore.finishActiveExecution(pushData);
				workflowHelpers.setDocumentTitle(execution.workflowData.name, 'IDLE');
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

	async function stopWaitingForWebhook() {
		try {
			await workflowsStore.removeTestWebhook(workflowsStore.workflowId);
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.stopWaitingForWebhook.title'));
			return;
		}
	}

	return {
		consolidateRunDataAndStartNodes,
		runWorkflow,
		runWorkflowResolvePending,
		runWorkflowApi,
		stopCurrentExecution,
		stopWaitingForWebhook,
	};
}
