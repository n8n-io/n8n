import {
	AI_NODES_PACKAGE_NAME,
	DUPLICATE_POSTFFIX,
	IN_PROGRESS_EXECUTION_ID,
	ERROR_TRIGGER_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
} from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { INodeUi, IStartRunData, IWorkflowDb } from '@/Interface';
import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionFlattedResponse,
} from '@/features/execution/executions/executions.types';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { defineStore } from 'pinia';
import type {
	IDataObject,
	ExecutionSummary,
	INode,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeTypes,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	INodeType,
} from 'n8n-workflow';
import { deepCopy, TelemetryHelpers } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/app/api/workflows';
import { useUIStore } from '@/app/stores/ui.store';
import { makeRestApiRequest, ResponseError, type WorkflowHistory } from '@n8n/rest-api-client';
import {
	unflattenExecutionData,
	findTriggerNodeToAutoSelect,
} from '@/features/execution/executions/executions.utils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { i18n } from '@n8n/i18n';

import { computed, ref, watch } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ExecutionRedactionQueryDto, PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useSettingsStore } from './settings.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useUsersStore } from '@/features/settings/users/users.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { isChatNode } from '@/app/utils/aiUtils';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { hasRole } from '@/app/utils/rbac/checks';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';

const createEmptyWorkflow = (): IWorkflowDb => ({
	id: '',
	name: '',
	description: '',
	active: false,
	activeVersionId: null,
	isArchived: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {},
	nodes: [],
	settings: { ...DEFAULT_SETTINGS },
	tags: [],
	pinData: {},
	versionId: '',
	usedCredentials: [],
});

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const workflowHelpers = useWorkflowHelpers();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeHelpers = useNodeHelpers();
	const usersStore = useUsersStore();
	const nodeTypesStore = useNodeTypesStore();
	const sourceControlStore = useSourceControlStore();
	const workflowsListStore = useWorkflowsListStore();

	const workflow = ref<IWorkflowDb>(createEmptyWorkflow());

	const workflowId = computed(() => workflow.value.id);
	const workflowExecutionSession = computed(() =>
		useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId(workflowId.value)),
	);
	const workflowExecutionData = computed({
		get: () => workflowExecutionSession.value.activeExecution,
		set: (execution: IExecutionResponse | null) => {
			if (!execution) {
				const activeExecutionId = workflowExecutionSession.value.activeExecutionId;
				if (activeExecutionId) {
					useExecutionDataStore(createExecutionDataId(activeExecutionId)).resetExecutionData();
				}
				workflowExecutionSession.value.setPendingExecution(null);
				return;
			}

			if (execution.id === IN_PROGRESS_EXECUTION_ID) {
				workflowExecutionSession.value.setPendingExecution(execution);
				return;
			}

			useExecutionDataStore(createExecutionDataId(execution.id)).setExecution(execution);
		},
	});
	const workflowExecutionStartedData = computed(
		() => workflowExecutionSession.value.activeExecutionStartedData,
	);
	const workflowExecutionResultDataLastUpdate = computed(
		() => workflowExecutionSession.value.activeExecutionResultDataLastUpdate,
	);
	const workflowExecutionPairedItemMappings = computed(
		() => workflowExecutionSession.value.activeExecutionPairedItemMappings,
	);
	const currentWorkflowExecutions = computed({
		get: () => workflowExecutionSession.value.currentWorkflowExecutions,
		set: (executions: ExecutionSummary[]) =>
			workflowExecutionSession.value.setCurrentWorkflowExecutions(executions),
	});
	const lastSuccessfulExecution = computed({
		get: () => workflowExecutionSession.value.lastSuccessfulExecution,
		set: (execution: IExecutionResponse | null) =>
			workflowExecutionSession.value.setLastSuccessfulExecution(execution),
	});
	const executionWaitingForWebhook = computed({
		get: () => workflowExecutionSession.value.executionWaitingForWebhook,
		set: (waitingForWebhook: boolean) =>
			workflowExecutionSession.value.setExecutionWaitingForWebhook(waitingForWebhook),
	});
	const isInDebugMode = computed({
		get: () => workflowExecutionSession.value.isInDebugMode,
		set: (debugMode: boolean) => workflowExecutionSession.value.setDebugMode(debugMode),
	});
	const chatMessages = computed({
		get: () => workflowExecutionSession.value.chatMessages,
		set: (messages: string[]) => {
			workflowExecutionSession.value.resetChatMessages();
			messages.forEach((message) => workflowExecutionSession.value.appendChatMessage(message));
		},
	});
	const chatPartialExecutionDestinationNode = computed({
		get: () => workflowExecutionSession.value.chatPartialExecutionDestinationNode,
		set: (nodeName: string | null) =>
			workflowExecutionSession.value.setChatPartialExecutionDestinationNode(nodeName),
	});
	const selectedTriggerNodeName = computed({
		get: () => workflowExecutionSession.value.selectedTriggerNodeName,
		set: (nodeName: string | undefined) =>
			workflowExecutionSession.value.setSelectedTriggerNodeName(nodeName),
	});
	const previousExecutionId = computed(() => workflowExecutionSession.value.previousExecutionId);

	// A workflow is new if it hasn't been saved to the backend yet.
	// TODO: move to workflowDocumentStore after `workflow` ref is removed from this store.
	// When moved, preserve the `workflowsListStore.getWorkflowById` coupling — pure
	// `workflowId === ''` semantics regress the imported-workflow-with-stale-ID case.
	const isNewWorkflow = computed(() => {
		if (!workflow.value.id) return true;

		// Check if the workflow exists in workflowsById
		const existingWorkflow = workflowsListStore.getWorkflowById(workflow.value.id);
		// If workflow doesn't exist in the store or has no ID, it's new
		return !existingWorkflow?.id;
	});

	// A workflow is new if it hasn't been saved to the backend yet
	const isWorkflowSaved = computed(() => {
		return Object.keys(workflowsListStore.workflowsById).reduce<Record<string, boolean>>(
			(acc, workflowId) => {
				acc[workflowId] = true;
				return acc;
			},
			{},
		);
	});

	const workflowTriggerNodes = computed(() =>
		workflow.value.nodes.filter((node: INodeUi) => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType && nodeType.group.includes('trigger');
		}),
	);

	const currentWorkflowHasWebhookNode = computed(
		() => !!workflow.value.nodes.find((node: INodeUi) => !!node.webhookId),
	);

	const getWorkflowRunData = computed<IRunData | null>(
		() => workflowExecutionSession.value.activeExecutionRunData,
	);

	const isWorkflowRunning = computed(() => workflowExecutionSession.value.isWorkflowRunning);

	const executedNode = computed(() => workflowExecutionSession.value.activeExecution?.executedNode);

	const getAllLoadedFinishedExecutions = computed(
		() => workflowExecutionSession.value.getAllLoadedFinishedExecutions,
	);

	const getWorkflowExecution = computed(() => workflowExecutionSession.value.activeExecution);

	const getPastChatMessages = computed(() => workflowExecutionSession.value.getPastChatMessages);

	const selectableTriggerNodes = computed(() =>
		workflowTriggerNodes.value.filter((node) => !node.disabled && !isChatNode(node)),
	);

	const workflowExecutionTriggerNodeName = computed(
		() => workflowExecutionSession.value.executionTriggerNodeName,
	);

	const canViewWorkflows = computed(
		() => !settingsStore.isChatFeatureEnabled || !hasRole(['global:chatUser']),
	);

	/**
	 * Sets the active execution id
	 *
	 * @param {string} id used to indicate the id of the active execution
	 * @param {null} id used to indicate that an execution has started but its id has not been retrieved yet
	 * @param {undefined} id used to indicate there is no active execution
	 */
	function setActiveExecutionId(id: string | null | undefined) {
		workflowExecutionSession.value.setActiveExecutionId(id);
	}

	function getWorkflowResultDataByNodeName(nodeName: string): ITaskData[] | null {
		return workflowExecutionSession.value.getActiveExecutionRunDataByNodeName(nodeName);
	}

	// Finds a uniquely identifying partial id for a node, relying on order for uniqueness in edge cases
	function getPartialIdForNode(fullId: string): string {
		for (let length = 6; length < fullId.length; ++length) {
			const partialId = fullId.slice(0, length);
			if (workflow.value.nodes.filter((x) => x.id.startsWith(partialId)).length === 1) {
				return partialId;
			}
		}
		return fullId;
	}

	function getExecutionDataById(id: string): ExecutionSummary | undefined {
		return currentWorkflowExecutions.value.find((execution) => execution.id === id);
	}

	function getNodeTypes(): INodeTypes {
		const nodeTypes: INodeTypes = {
			nodeTypes: {},
			init: async (): Promise<void> => {},
			getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
				const nodeTypeDescription =
					nodeTypesStore.getNodeType(nodeType, version) ??
					nodeTypesStore.communityNodeType(nodeType)?.nodeDescription ??
					null;
				if (nodeTypeDescription === null) {
					return undefined;
				}

				return {
					description: nodeTypeDescription,
					// As we do not have the trigger/poll functions available in the frontend
					// we use the information available to figure out what are trigger nodes
					// @ts-ignore
					trigger:
						(![ERROR_TRIGGER_NODE_TYPE].includes(nodeType) &&
							nodeTypeDescription.inputs.length === 0 &&
							!nodeTypeDescription.webhooks) ||
						undefined,
				};
			},
		} as unknown as INodeTypes;

		return nodeTypes;
	}

	function convertTemplateNodeToNodeUi(node: IWorkflowTemplateNode): INodeUi {
		const filteredCredentials = Object.keys(node.credentials ?? {}).reduce<INodeCredentials>(
			(credentials, curr) => {
				const credential = node?.credentials?.[curr];
				if (!credential || typeof credential === 'string') {
					return credentials;
				}

				credentials[curr] = credential;

				return credentials;
			},
			{},
		);

		return {
			...node,
			credentials: filteredCredentials,
		};
	}

	async function getWorkflowFromUrl(url: string, projectId: string): Promise<IWorkflowDb> {
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/workflows/from-url', {
			url,
			projectId,
		});
	}

	async function fetchLastSuccessfulExecution() {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowId.value),
		);
		const workflowPermissions = getResourcePermissions(workflowDocumentStore.scopes).workflow;

		try {
			const wfId = workflow.value.id;
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(wfId));

			if (
				isNewWorkflow.value ||
				sourceControlStore.preferences.branchReadOnly ||
				uiStore.isReadOnlyView ||
				!workflowPermissions.update ||
				workflowDocumentStore.isArchived
			) {
				return;
			}

			workflowExecutionSession.value.setLastSuccessfulExecution(
				await workflowsApi.getLastSuccessfulExecution(rootStore.restApiContext, workflowId.value),
			);
		} catch (e: unknown) {
			// no need to do anything if fails
		}
	}

	async function getActivationError(id: string): Promise<string | undefined> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/active-workflows/error/${id}`,
		);
	}

	function setWorkflowId(id?: string) {
		workflow.value.id = id || '';
	}

	function resetWorkflow() {
		const previousId = workflow.value.id;
		workflow.value = createEmptyWorkflow();
		if (previousId) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(previousId));
			workflowDocumentStore.reset();
		}
	}

	function setWorkflowActiveVersion(version: WorkflowHistory | null) {
		workflow.value.activeVersion = deepCopy(version);
		const wfId = workflow.value.id;
		if (wfId) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(wfId));
			workflowDocumentStore.setActiveVersion(deepCopy(version));
		}
	}

	// replace invalid credentials in workflow
	function replaceInvalidWorkflowCredentials(data: {
		credentials: INodeCredentialsDetails;
		invalid: INodeCredentialsDetails;
		type: string;
	}) {
		workflow.value.nodes.forEach((node: INodeUi) => {
			const nodeCredentials: INodeCredentials | undefined = (node as unknown as INode).credentials;
			if (!nodeCredentials?.[data.type]) {
				return;
			}

			const nodeCredentialDetails: INodeCredentialsDetails | string = nodeCredentials[data.type];

			if (
				typeof nodeCredentialDetails === 'string' &&
				nodeCredentialDetails === data.invalid.name
			) {
				(node.credentials as INodeCredentials)[data.type] = data.credentials;
				return;
			}

			if (nodeCredentialDetails.id === null) {
				if (nodeCredentialDetails.name === data.invalid.name) {
					(node.credentials as INodeCredentials)[data.type] = data.credentials;
				}
				return;
			}

			if (nodeCredentialDetails.id === data.invalid.id) {
				(node.credentials as INodeCredentials)[data.type] = data.credentials;
			}
		});
	}

	// Assign credential to all nodes that support it but don't have it set
	function assignCredentialToMatchingNodes(data: {
		credentials: INodeCredentialsDetails;
		type: string;
		currentNodeName: string;
	}): number {
		let updatedNodesCount = 0;

		workflow.value.nodes.forEach((node: INodeUi) => {
			// Skip the current node (it was just set)
			if (node.name === data.currentNodeName) {
				return;
			}

			// Skip if node already has credential set
			if (node.credentials && Object.keys(node.credentials).length > 0) {
				return;
			}

			// Get node type to check if it supports this credential
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType?.credentials) {
				return;
			}

			// Check if this node type supports the credential type
			// and if the credential is actually active given the node's current parameters
			const credentialDescription = nodeType.credentials.find((cred) => cred.name === data.type);
			if (!credentialDescription) {
				return;
			}

			if (
				credentialDescription.displayOptions &&
				!nodeHelpers.displayParameter(node.parameters, credentialDescription, '', node)
			) {
				return;
			}

			// Assign the same credential to the node
			node.credentials ??= {} satisfies INodeCredentials;
			node.credentials[data.type] = data.credentials;

			updatedNodesCount++;
		});

		return updatedNodesCount;
	}

	async function archiveWorkflow(id: string, expectedChecksum?: string) {
		const updatedWorkflow = await workflowsListStore.archiveWorkflowInList(id, expectedChecksum);
		setWorkflowInactive(id);

		if (id === workflow.value.id) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setIsArchived(true);
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum!);
		}
	}

	async function unarchiveWorkflow(id: string) {
		const updatedWorkflow = await workflowsListStore.unarchiveWorkflowInList(id);

		if (id === workflow.value.id) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setIsArchived(false);
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum!);
		}
	}

	function setWorkflowActive(
		targetWorkflowId: string,
		activeVersion: WorkflowHistory,
		clearDirtyState: boolean,
	) {
		workflowsListStore.setWorkflowActiveInCache(targetWorkflowId, activeVersion);

		if (targetWorkflowId === workflow.value.id && clearDirtyState) {
			uiStore.markStateClean();
		}
	}

	function setWorkflowInactive(targetWorkflowId: string) {
		workflowsListStore.setWorkflowInactiveInCache(targetWorkflowId);
	}

	async function getDuplicateCurrentWorkflowName(currentWorkflowName: string): Promise<string> {
		if (
			currentWorkflowName &&
			currentWorkflowName.length + DUPLICATE_POSTFFIX.length >= MAX_WORKFLOW_NAME_LENGTH
		) {
			return currentWorkflowName;
		}

		let newName = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;
		try {
			const newWorkflow = await workflowsApi.getNewWorkflow(rootStore.restApiContext, {
				name: newName,
			});
			newName = newWorkflow.name;
		} catch (e) {}
		return newName;
	}

	function setWorkflowExecutionRunData(workflowResultData: IRunExecutionData) {
		const activeExecutionId = workflowExecutionSession.value.activeExecutionId;
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).setExecutionRunData(
				workflowResultData,
			);
			return;
		}

		const pendingExecution = workflowExecutionSession.value.pendingExecution;
		if (!pendingExecution) return;

		workflowExecutionSession.value.setPendingExecution({
			...pendingExecution,
			data: workflowResultData,
		});
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		uiStore.markStateDirty();

		if (uiStore.lastSelectedNode === nameData.old) {
			uiStore.lastSelectedNode = nameData.new;
		}

		const activeExecutionId = workflowExecutionSession.value.activeExecutionId;
		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).renameExecutionDataNode(
				nameData.old,
				nameData.new,
			);
		}
		workflowExecutionSession.value.renameExecutionSessionNode(nameData.old, nameData.new);

		if (workflowId.value) {
			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowId.value),
			);
			workflowDocumentStore.renameNodeMetadata(nameData.old, nameData.new);
			workflowDocumentStore.renamePinDataNode(nameData.old, nameData.new);
		}
	}

	async function trackNodeExecution(pushData: PushPayload<'nodeExecuteAfter'>): Promise<void> {
		const nodeName = pushData.nodeName;

		if (pushData.data.error) {
			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowId.value),
			);
			const node = workflowDocumentStore.getNodeByName(nodeName);
			telemetry.track('Manual exec errored', {
				error_title: pushData.data.error.message,
				node_type: node?.type,
				node_type_version: node?.typeVersion,
				node_id: node?.id,
				node_graph_string: JSON.stringify(
					TelemetryHelpers.generateNodesGraph(
						workflowDocumentStore.serialize(),
						workflowHelpers.getNodeTypes(),
						{
							isCloudDeployment: settingsStore.isCloudDeployment,
						},
					).nodeGraph,
				),
			});
		}
	}

	function addNodeExecutionStartedData(data: NodeExecuteBefore['data']): void {
		useExecutionDataStore(createExecutionDataId(data.executionId)).addNodeExecutionStartedData(
			data,
		);
	}

	function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		useExecutionDataStore(createExecutionDataId(pushData.executionId)).updateNodeExecutionStatus(
			pushData,
		);
		if (pushData.data.executionStatus !== 'waiting') {
			void trackNodeExecution(pushData);
		}
	}

	function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		useExecutionDataStore(createExecutionDataId(pushData.executionId)).updateNodeExecutionRunData(
			pushData,
		);
	}

	function clearNodeExecutionData(nodeName: string): void {
		workflowExecutionSession.value.clearActiveNodeExecutionData(nodeName);
	}

	function activeNode(): INodeUi | null {
		// kept here for FE hooks
		const ndvStore = useNDVStore();
		return ndvStore.activeNode;
	}

	// TODO: For sure needs some kind of default filter like last day, with max 10 results, ...
	async function getPastExecutions(
		filter: IDataObject,
		limit: number,
		lastId?: string,
		firstId?: string,
	): Promise<IExecutionsListResponse> {
		let sendData = {};
		if (filter) {
			sendData = {
				filter,
				firstId,
				lastId,
				limit,
			};
		}
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/executions', sendData);
	}

	async function getExecution(id: string): Promise<IExecutionResponse | undefined> {
		const response = await makeRestApiRequest<IExecutionFlattedResponse | undefined>(
			rootStore.restApiContext,
			'GET',
			`/executions/${id}`,
		);

		return response && unflattenExecutionData(response);
	}

	/**
	 * Creates a new workflow with the provided data.
	 * Ensures that the new workflow is not active upon creation.
	 * If the project ID is not provided in the data, it assigns the current project ID from the project store.
	 */
	async function createNewWorkflow(sendData: WorkflowDataCreate): Promise<IWorkflowDb> {
		// make sure that the new ones are not active
		sendData.active = false;

		// When activation is false, ensure MCP is disabled
		if (!sendData.settings) {
			sendData.settings ??= {};
		}
		sendData.settings.availableInMCP = false;

		const projectStore = useProjectsStore();

		if (!sendData.projectId && projectStore.currentProjectId) {
			(sendData as unknown as IDataObject).projectId = projectStore.currentProjectId;
		}

		const newWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			'/workflows',
			sendData as unknown as IDataObject,
		);

		const isAIWorkflow = workflowHelpers.containsNodeFromPackage(
			newWorkflow,
			AI_NODES_PACKAGE_NAME,
		);
		if (isAIWorkflow && !usersStore.isEasyAIWorkflowOnboardingDone) {
			await updateCurrentUserSettings(rootStore.restApiContext, {
				easyAIWorkflowOnboarded: true,
			});
			usersStore.setEasyAIWorkflowOnboardingDone();
		}

		return newWorkflow;
	}

	async function updateWorkflow(
		id: string,
		data: WorkflowDataUpdate,
		forceSave = false,
	): Promise<IWorkflowDb> {
		if (data.settings === null) {
			data.settings = undefined;
		}

		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'PATCH',
			`/workflows/${id}${forceSave ? '?forceSave=true' : ''}`,
			data as unknown as IDataObject,
		);

		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to update workflow');
		}

		if (id === workflow.value.id) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		}

		if (
			workflowHelpers.containsNodeFromPackage(updatedWorkflow, AI_NODES_PACKAGE_NAME) &&
			!usersStore.isEasyAIWorkflowOnboardingDone
		) {
			await updateCurrentUserSettings(rootStore.restApiContext, {
				easyAIWorkflowOnboarded: true,
			});
			usersStore.setEasyAIWorkflowOnboardingDone();
		}

		return updatedWorkflow;
	}

	async function publishWorkflow(
		id: string,
		data: { versionId: string; name?: string; description?: string; expectedChecksum?: string },
	): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/activate`,
			data as unknown as IDataObject,
		);

		return updatedWorkflow;
	}

	async function deactivateWorkflow(id: string, expectedChecksum?: string): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/deactivate`,
			{ expectedChecksum },
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to deactivate workflow');
		}

		setWorkflowInactive(id);

		if (id === workflow.value.id) {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
			workflowDocumentStore.setVersionData({
				versionId: updatedWorkflow.versionId,
				name: workflowDocumentStore.versionData?.name ?? null,
				description: workflowDocumentStore.versionData?.description ?? null,
			});
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		}

		return updatedWorkflow;
	}

	// Update a single workflow setting key while preserving existing settings
	async function updateWorkflowSetting<K extends keyof IWorkflowSettings>(
		id: string,
		key: K,
		value: IWorkflowSettings[K],
	): Promise<IWorkflowDb> {
		// Determine current settings and versionId for the target workflow
		let currentSettings: IWorkflowSettings = {} as IWorkflowSettings;
		let currentVersionId = '';
		let currentChecksum = '';
		const isCurrentWorkflow = id === workflow.value.id;
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));

		if (isCurrentWorkflow) {
			currentSettings = workflowDocumentStore.settings;
			currentVersionId = workflowDocumentStore.versionId;
			currentChecksum = workflowDocumentStore.checksum;
		} else {
			const cached = workflowsListStore.getWorkflowById(id);
			if (cached && cached.versionId) {
				currentSettings = cached.settings ?? ({} as IWorkflowSettings);
				currentVersionId = cached.versionId;
			} else {
				const fetched = await workflowsListStore.fetchWorkflow(id);
				currentSettings = fetched.settings ?? ({} as IWorkflowSettings);
				currentVersionId = fetched.versionId;
			}
		}

		const newSettings: IWorkflowSettings = {
			...(currentSettings ?? ({} as IWorkflowSettings)),
			[key]: value,
		};

		const updated = await updateWorkflow(id, {
			versionId: currentVersionId,
			settings: newSettings,
			...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
		});

		// Update local store state to reflect the change
		if (isCurrentWorkflow) {
			workflowDocumentStore.setSettings(updated.settings ?? {});
		} else if (workflowsListStore.getWorkflowById(id)) {
			workflowsListStore.updateWorkflowInCache(id, {
				settings: updated.settings,
				versionId: updated.versionId,
			});
		}

		return updated;
	}

	async function runWorkflow(startRunData: IStartRunData): Promise<IExecutionPushResponse> {
		try {
			return await makeRestApiRequest(
				rootStore.restApiContext,
				'POST',
				`/workflows/${startRunData.workflowId}/run`,
				startRunData as unknown as IDataObject,
			);
		} catch (error) {
			if (error.response?.status === 413) {
				throw new ResponseError(i18n.baseText('workflowRun.showError.payloadTooLarge'), {
					errorCode: 413,
					httpStatusCode: 413,
				});
			}
			throw error;
		}
	}

	async function removeTestWebhook(targetWorkflowId: string): Promise<boolean> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'DELETE',
			`/test-webhook/${targetWorkflowId}`,
		);
	}

	async function fetchExecutionDataById(
		executionId: string,
		queryParams?: ExecutionRedactionQueryDto,
	): Promise<IExecutionResponse | null> {
		const response = await workflowsApi.getExecutionData(
			rootStore.restApiContext,
			executionId,
			queryParams,
		);
		return response && unflattenExecutionData(response);
	}

	function deleteExecution(execution: ExecutionSummary): void {
		workflowExecutionSession.value.deleteExecution(execution);
	}

	function addToCurrentExecutions(executions: ExecutionSummary[]): void {
		workflowExecutionSession.value.addToCurrentExecutions(executions);
	}

	function getBinaryUrl(
		binaryDataId: string,
		action: 'view' | 'download',
		fileName: string,
		mimeType: string,
	): string {
		let restUrl = rootStore.restUrl;
		if (restUrl.startsWith('/')) restUrl = window.location.origin + restUrl;
		const url = new URL(`${restUrl}/binary-data`);
		url.searchParams.append('id', binaryDataId);
		url.searchParams.append('action', action);
		if (fileName) url.searchParams.append('fileName', fileName);
		if (mimeType) url.searchParams.append('mimeType', mimeType);
		return url.toString();
	}

	function resetChatMessages(): void {
		workflowExecutionSession.value.resetChatMessages();
	}

	function appendChatMessage(message: string): void {
		workflowExecutionSession.value.appendChatMessage(message);
	}

	function setSelectedTriggerNodeName(value: string | undefined) {
		workflowExecutionSession.value.setSelectedTriggerNodeName(value);
	}

	watch(
		[selectableTriggerNodes, workflowExecutionTriggerNodeName],
		([newSelectable, currentTrigger], [oldSelectable]) => {
			if (currentTrigger !== undefined) {
				selectedTriggerNodeName.value = currentTrigger;
				return;
			}

			if (
				selectedTriggerNodeName.value === undefined ||
				newSelectable.every((node) => node.name !== selectedTriggerNodeName.value)
			) {
				selectedTriggerNodeName.value = findTriggerNodeToAutoSelect(
					selectableTriggerNodes.value,
					nodeTypesStore.getNodeType,
				)?.name;
				return;
			}

			const newTrigger = newSelectable?.find((node) =>
				oldSelectable?.every((old) => old.name !== node.name),
			);

			if (newTrigger !== undefined) {
				// Select newly added node
				selectedTriggerNodeName.value = newTrigger.name;
			}
		},
		{ immediate: true },
	);

	return {
		workflow,
		currentWorkflowExecutions,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		workflowExecutionResultDataLastUpdate,
		workflowExecutionStartedData,
		previousExecutionId,
		executionWaitingForWebhook,
		isInDebugMode,
		chatMessages,
		chatPartialExecutionDestinationNode,
		workflowId,
		isNewWorkflow,
		isWorkflowSaved,
		workflowTriggerNodes,
		currentWorkflowHasWebhookNode,
		getWorkflowRunData,
		getWorkflowResultDataByNodeName,
		isWorkflowRunning,
		executedNode,
		getAllLoadedFinishedExecutions,
		getWorkflowExecution,
		getPastChatMessages,
		selectedTriggerNodeName,
		workflowExecutionTriggerNodeName,
		getExecutionDataById,
		getNodeTypes,
		convertTemplateNodeToNodeUi,
		getWorkflowFromUrl,
		getActivationError,
		setWorkflowId,
		resetWorkflow,
		addNodeExecutionStartedData,
		setWorkflowActiveVersion,
		replaceInvalidWorkflowCredentials,
		assignCredentialToMatchingNodes,
		archiveWorkflow,
		unarchiveWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		getDuplicateCurrentWorkflowName,
		setWorkflowExecutionRunData,
		renameNodeSelectedAndExecution,
		updateNodeExecutionRunData,
		updateNodeExecutionStatus,
		clearNodeExecutionData,
		activeNode,
		getPastExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		publishWorkflow,
		deactivateWorkflow,
		updateWorkflowSetting,
		runWorkflow,
		removeTestWebhook,
		fetchExecutionDataById,
		deleteExecution,
		addToCurrentExecutions,
		getBinaryUrl,
		resetChatMessages,
		appendChatMessage,
		getPartialIdForNode,
		setSelectedTriggerNodeName,
		fetchLastSuccessfulExecution,
		lastSuccessfulExecution,
		canViewWorkflows,
		// This is exposed to ease the refactoring to the injected workflowState composable
		// Please do not use outside this context
		private: {
			setActiveExecutionId,
		},
	};
});
