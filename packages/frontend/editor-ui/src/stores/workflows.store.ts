import {
	AI_NODES_PACKAGE_NAME,
	CHAT_TRIGGER_NODE_TYPE,
	DEFAULT_NEW_WORKFLOW_NAME,
	DEFAULT_WORKFLOW_PAGE_SIZE,
	DUPLICATE_POSTFFIX,
	ERROR_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	LOCAL_STORAGE_LOGS_PANEL_OPEN,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	STORES,
	WAIT_NODE_TYPE,
} from '@/constants';
import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	INewWorkflowData,
	INodeMetadata,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IStartRunData,
	IUpdateInformation,
	IUsedCredential,
	IWorkflowDataUpdate,
	IWorkflowDb,
	IWorkflowsMap,
	NodeMetadataMap,
	WorkflowMetadata,
	IExecutionFlattedResponse,
	IWorkflowTemplateNode,
	IWorkflowDataCreate,
	WorkflowListResource,
} from '@/Interface';
import { defineStore } from 'pinia';
import type {
	IConnection,
	IConnections,
	IDataObject,
	ExecutionSummary,
	INode,
	INodeConnections,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeIssueData,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeTypes,
	IPinData,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	INodeType,
} from 'n8n-workflow';
import {
	deepCopy,
	NodeConnectionTypes,
	NodeHelpers,
	SEND_AND_WAIT_OPERATION,
	Workflow,
	TelemetryHelpers,
} from 'n8n-workflow';
import { findLast, pick, isEqual } from 'lodash-es';

import { useRootStore } from '@/stores/root.store';
import * as workflowsApi from '@/api/workflows';
import { useUIStore } from '@/stores/ui.store';
import { dataPinningEventBus } from '@/event-bus';
import { isObject } from '@/utils/objectUtils';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import { isJsonKeyObject, isEmpty, stringSizeInBytes, isPresent } from '@/utils/typesUtils';
import { makeRestApiRequest, unflattenExecutionData, ResponseError } from '@/utils/apiUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getCredentialOnlyNodeTypeName } from '@/utils/credentialOnlyNodes';
import { i18n } from '@/plugins/i18n';

import { computed, ref } from 'vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { clearPopupWindowState, openFormPopupWindow } from '@/utils/executionUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useUsersStore } from '@/stores/users.store';
import { updateCurrentUserSettings } from '@/api/users';
import { useExecutingNode } from '@/composables/useExecutingNode';
import { LOGS_PANEL_STATE } from '@/components/CanvasChat/types/logs';
import { useLocalStorage } from '@vueuse/core';

const defaults: Omit<IWorkflowDb, 'id'> & { settings: NonNullable<IWorkflowDb['settings']> } = {
	name: '',
	active: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {},
	nodes: [],
	settings: {
		executionOrder: 'v1',
	},
	tags: [],
	pinData: {},
	versionId: '',
	usedCredentials: [],
};

const createEmptyWorkflow = (): IWorkflowDb => ({
	id: PLACEHOLDER_EMPTY_WORKFLOW_ID,
	...defaults,
});

let cachedWorkflowKey: string | null = '';
let cachedWorkflow: Workflow | null = null;

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const router = useRouter();
	const workflowHelpers = useWorkflowHelpers({ router });
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeHelpers = useNodeHelpers();
	const usersStore = useUsersStore();

	const version = computed(() => settingsStore.partialExecutionVersion);
	const workflow = ref<IWorkflowDb>(createEmptyWorkflow());
	// For paginated workflow lists
	const totalWorkflowCount = ref(0);
	const usedCredentials = ref<Record<string, IUsedCredential>>({});

	const activeWorkflows = ref<string[]>([]);
	const activeWorkflowExecution = ref<ExecutionSummary | null>(null);
	const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
	const workflowExecutionData = ref<IExecutionResponse | null>(null);
	const workflowExecutionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const activeExecutionId = ref<string | null>(null);
	const previousExecutionId = ref<string | null>(null);
	const subWorkflowExecutionError = ref<Error | null>(null);
	const executionWaitingForWebhook = ref(false);
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const nodeMetadata = ref<NodeMetadataMap>({});
	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);
	const chatPartialExecutionDestinationNode = ref<string | null>(null);
	const isLogsPanelOpen = useLocalStorage(LOCAL_STORAGE_LOGS_PANEL_OPEN, false);
	const preferPopOutLogsView = ref(false);
	const logsPanelState = computed(() =>
		isLogsPanelOpen.value
			? preferPopOutLogsView.value
				? LOGS_PANEL_STATE.FLOATING
				: LOGS_PANEL_STATE.ATTACHED
			: LOGS_PANEL_STATE.CLOSED,
	);

	const { executingNode, addExecutingNode, removeExecutingNode, clearNodeExecutionQueue } =
		useExecutingNode();

	const workflowName = computed(() => workflow.value.name);

	const workflowId = computed(() => workflow.value.id);

	const workflowVersionId = computed(() => workflow.value.versionId);

	const workflowSettings = computed(() => workflow.value.settings ?? { ...defaults.settings });

	const workflowTags = computed(() => workflow.value.tags as string[]);

	const allWorkflows = computed(() =>
		Object.values(workflowsById.value).sort((a, b) => a.name.localeCompare(b.name)),
	);

	const isNewWorkflow = computed(() => workflow.value.id === PLACEHOLDER_EMPTY_WORKFLOW_ID);

	const isWorkflowActive = computed(() => workflow.value.active);

	const workflowTriggerNodes = computed(() =>
		workflow.value.nodes.filter((node: INodeUi) => {
			const nodeTypesStore = useNodeTypesStore();
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType && nodeType.group.includes('trigger');
		}),
	);

	const currentWorkflowHasWebhookNode = computed(
		() => !!workflow.value.nodes.find((node: INodeUi) => !!node.webhookId),
	);

	const getWorkflowRunData = computed<IRunData | null>(() => {
		if (!workflowExecutionData.value?.data?.resultData) {
			return null;
		}

		return workflowExecutionData.value.data.resultData.runData;
	});

	const allConnections = computed(() => workflow.value.connections);

	const allNodes = computed<INodeUi[]>(() => workflow.value.nodes);

	const willNodeWait = (node: INodeUi): boolean => {
		return (
			(node.type === WAIT_NODE_TYPE ||
				node.type === FORM_NODE_TYPE ||
				node.parameters?.operation === SEND_AND_WAIT_OPERATION) &&
			node.disabled !== true
		);
	};

	const isWaitingExecution = computed(() => {
		const activeNode = useNDVStore().activeNode;

		if (activeNode) {
			if (willNodeWait(activeNode)) return true;

			const workflow = getCurrentWorkflow();
			const parentNodes = workflow.getParentNodes(activeNode.name);

			for (const parentNode of parentNodes) {
				if (willNodeWait(workflow.nodes[parentNode])) {
					return true;
				}
			}

			return false;
		}
		return allNodes.value.some((node) => willNodeWait(node));
	});

	const isWorkflowRunning = computed(() => {
		if (uiStore.isActionActive.workflowRunning) return true;

		if (activeExecutionId.value) {
			const execution = getWorkflowExecution;
			if (execution.value && execution.value.status === 'waiting' && !execution.value.finished) {
				return true;
			}
		}

		return false;
	});

	// Names of all nodes currently on canvas.
	const canvasNames = computed(() => new Set(allNodes.value.map((n) => n.name)));

	const nodesByName = computed(() => {
		return workflow.value.nodes.reduce<Record<string, INodeUi>>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {});
	});

	const nodesIssuesExist = computed(() => {
		for (const node of workflow.value.nodes) {
			const isNodeDisabled = node.disabled === true;
			const noNodeIssues = node.issues === undefined || Object.keys(node.issues).length === 0;
			if (isNodeDisabled || noNodeIssues) {
				continue;
			}

			return true;
		}

		return false;
	});

	const pinnedWorkflowData = computed(() => workflow.value.pinData);

	const shouldReplaceInputDataWithPinData = computed(() => {
		return !activeWorkflowExecution.value || activeWorkflowExecution.value.mode === 'manual';
	});

	const executedNode = computed(() => workflowExecutionData.value?.executedNode);

	const getAllLoadedFinishedExecutions = computed(() => {
		return currentWorkflowExecutions.value.filter(
			(ex) => ex.finished === true || ex.stoppedAt !== undefined,
		);
	});

	const getWorkflowExecution = computed(() => workflowExecutionData.value);

	const getPastChatMessages = computed(() => Array.from(new Set(chatMessages.value)));

	const connectionsByDestinationNode = computed(() =>
		Workflow.getConnectionsByDestination(workflow.value.connections),
	);

	function setActiveExecutionId(id: string | null) {
		previousExecutionId.value = activeExecutionId.value;
		activeExecutionId.value = id;
	}

	function getWorkflowResultDataByNodeName(nodeName: string): ITaskData[] | null {
		if (getWorkflowRunData.value === null) {
			return null;
		}
		if (!getWorkflowRunData.value.hasOwnProperty(nodeName)) {
			return null;
		}
		return getWorkflowRunData.value[nodeName];
	}

	function outgoingConnectionsByNodeName(nodeName: string): INodeConnections {
		if (workflow.value.connections.hasOwnProperty(nodeName)) {
			return workflow.value.connections[nodeName] as unknown as INodeConnections;
		}
		return {};
	}

	function incomingConnectionsByNodeName(nodeName: string): INodeConnections {
		if (connectionsByDestinationNode.value.hasOwnProperty(nodeName)) {
			return connectionsByDestinationNode.value[nodeName] as unknown as INodeConnections;
		}
		return {};
	}

	function nodeHasOutputConnection(nodeName: string): boolean {
		return workflow.value.connections.hasOwnProperty(nodeName);
	}

	function isNodeInOutgoingNodeConnections(rootNodeName: string, searchNodeName: string): boolean {
		const firstNodeConnections = outgoingConnectionsByNodeName(rootNodeName);
		if (!firstNodeConnections?.main?.[0]) return false;

		const connections = firstNodeConnections.main[0];
		if (connections.some((node) => node.node === searchNodeName)) return true;

		return connections.some((node) => isNodeInOutgoingNodeConnections(node.node, searchNodeName));
	}

	function getWorkflowById(id: string): IWorkflowDb {
		return workflowsById.value[id];
	}

	function getNodeByName(nodeName: string): INodeUi | null {
		return nodesByName.value[nodeName] || null;
	}

	function getNodeById(nodeId: string): INodeUi | undefined {
		return workflow.value.nodes.find((node) => node.id === nodeId);
	}

	function getNodesByIds(nodeIds: string[]): INodeUi[] {
		return nodeIds.map(getNodeById).filter(isPresent);
	}

	function getParametersLastUpdate(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.parametersLastUpdatedAt;
	}

	function getPinnedDataLastUpdate(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.pinnedDataLastUpdatedAt;
	}

	function getPinnedDataLastRemovedAt(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.pinnedDataLastRemovedAt;
	}

	function isNodePristine(nodeName: string): boolean {
		return nodeMetadata.value[nodeName] === undefined || nodeMetadata.value[nodeName].pristine;
	}

	function isNodeExecuting(nodeName: string): boolean {
		return executingNode.value.includes(nodeName);
	}

	function getExecutionDataById(id: string): ExecutionSummary | undefined {
		return currentWorkflowExecutions.value.find((execution) => execution.id === id);
	}

	function getPinDataSize(pinData: Record<string, string | INodeExecutionData[]> = {}): number {
		return Object.values(pinData).reduce<number>((acc, value) => {
			return acc + stringSizeInBytes(value);
		}, 0);
	}

	function getNodeTypes(): INodeTypes {
		const nodeTypes: INodeTypes = {
			nodeTypes: {},
			init: async (): Promise<void> => {},
			getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
				const nodeTypeDescription = useNodeTypesStore().getNodeType(nodeType, version);

				if (nodeTypeDescription === null) {
					return undefined;
				}

				return {
					description: nodeTypeDescription,
					// As we do not have the trigger/poll functions available in the frontend
					// we use the information available to figure out what are trigger nodes
					// @ts-ignore
					trigger:
						(![ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE].includes(nodeType) &&
							nodeTypeDescription.inputs.length === 0 &&
							!nodeTypeDescription.webhooks) ||
						undefined,
				};
			},
		} as unknown as INodeTypes;

		return nodeTypes;
	}

	// Returns a shallow copy of the nodes which means that all the data on the lower
	// levels still only gets referenced but the top level object is a different one.
	// This has the advantage that it is very fast and does not cause problems with vuex
	// when the workflow replaces the node-parameters.
	function getNodes(): INodeUi[] {
		return workflow.value.nodes.map((node) => ({ ...node }));
	}

	function setNodePositionById(id: string, position: INodeUi['position']): void {
		const node = workflow.value.nodes.find((n) => n.id === id);
		if (!node) return;

		setNodeValue({ name: node.name, key: 'position', value: position });
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

	function updateCachedWorkflow() {
		const nodeTypes = getNodeTypes();
		const nodes = getNodes();
		const connections = allConnections.value;

		cachedWorkflow = new Workflow({
			id: workflowId.value,
			name: workflowName.value,
			nodes,
			connections,
			active: false,
			nodeTypes,
			settings: workflowSettings.value,
			pinData: pinnedWorkflowData.value,
		});
	}

	function getWorkflow(nodes: INodeUi[], connections: IConnections, copyData?: boolean): Workflow {
		const nodeTypes = getNodeTypes();
		let cachedWorkflowId: string | undefined = workflowId.value;

		if (cachedWorkflowId && cachedWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			cachedWorkflowId = undefined;
		}

		cachedWorkflow = new Workflow({
			id: cachedWorkflowId,
			name: workflowName.value,
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings: workflowSettings.value,
			pinData: pinnedWorkflowData.value,
		});

		return cachedWorkflow;
	}

	function getCurrentWorkflow(copyData?: boolean): Workflow {
		const nodes = getNodes();
		const connections = allConnections.value;
		const cacheKey = JSON.stringify({ nodes, connections });
		if (!copyData && cachedWorkflow && cacheKey === cachedWorkflowKey) {
			return cachedWorkflow;
		}
		cachedWorkflowKey = cacheKey;

		return getWorkflow(nodes, connections, copyData);
	}

	async function getWorkflowFromUrl(url: string): Promise<IWorkflowDb> {
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/workflows/from-url', {
			url,
		});
	}

	async function getActivationError(id: string): Promise<string | undefined> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/active-workflows/error/${id}`,
		);
	}

	async function fetchWorkflowsPage(
		projectId?: string,
		page = 1,
		pageSize = DEFAULT_WORKFLOW_PAGE_SIZE,
		sortBy?: string,
		filters: { name?: string; tags?: string[]; active?: boolean; parentFolderId?: string } = {},
		includeFolders: boolean = false,
	): Promise<WorkflowListResource[]> {
		const filter = { ...filters, projectId };
		const options = {
			skip: (page - 1) * pageSize,
			take: pageSize,
			sortBy,
		};

		const { count, data } = await workflowsApi.getWorkflowsAndFolders(
			rootStore.restApiContext,
			Object.keys(filter).length ? filter : undefined,
			Object.keys(options).length ? options : undefined,
			includeFolders ? includeFolders : undefined,
		);
		totalWorkflowCount.value = count;
		// Also set fetched workflows to store
		// When fetching workflows from overview page, they don't have resource property
		// so in order to filter out folders, we need to check if resource is not folder
		data
			.filter((item) => item.resource !== 'folder')
			.forEach((item) => {
				addWorkflow({
					...item,
					nodes: [],
					connections: {},
					versionId: '',
				});
			});
		return data;
	}

	async function fetchAllWorkflows(projectId?: string): Promise<IWorkflowDb[]> {
		const filter = {
			projectId,
		};

		const { data: workflows } = await workflowsApi.getWorkflows(
			rootStore.restApiContext,
			isEmpty(filter) ? undefined : filter,
		);
		setWorkflows(workflows);
		return workflows;
	}

	async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
		const workflowData = await workflowsApi.getWorkflow(rootStore.restApiContext, id);
		addWorkflow(workflowData);
		return workflowData;
	}

	async function getNewWorkflowData(
		name?: string,
		projectId?: string,
		parentFolderId?: string,
	): Promise<INewWorkflowData> {
		let workflowData = {
			name: '',
			settings: { ...defaults.settings },
		};
		try {
			const data: IDataObject = {
				name,
				projectId,
				parentFolderId,
			};

			workflowData = await workflowsApi.getNewWorkflow(
				rootStore.restApiContext,
				isEmpty(data) ? undefined : data,
			);
		} catch (e) {
			// in case of error, default to original name
			workflowData.name = name || DEFAULT_NEW_WORKFLOW_NAME;
		}

		setWorkflowName({ newName: workflowData.name, setStateDirty: false });

		return workflowData;
	}

	function makeNewWorkflowShareable() {
		const { currentProject, personalProject } = useProjectsStore();
		const homeProject = currentProject ?? personalProject ?? {};
		const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];

		workflow.value.homeProject = homeProject as ProjectSharingData;
		workflow.value.scopes = scopes;
	}

	function resetWorkflow() {
		workflow.value = createEmptyWorkflow();
	}

	function resetState() {
		removeAllConnections({ setStateDirty: false });
		removeAllNodes({ setStateDirty: false, removePinData: true });

		setWorkflowExecutionData(null);
		resetAllNodesIssues();

		setActive(defaults.active);
		setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
		setWorkflowName({ newName: '', setStateDirty: false });
		setWorkflowSettings({ ...defaults.settings });
		setWorkflowTagIds([]);

		setActiveExecutionId(null);
		executingNode.value.length = 0;
		executionWaitingForWebhook.value = false;
	}

	function setWorkflowId(id?: string) {
		workflow.value.id = !id || id === 'new' ? PLACEHOLDER_EMPTY_WORKFLOW_ID : id;
	}

	function setUsedCredentials(data: IUsedCredential[]) {
		workflow.value.usedCredentials = data;
		usedCredentials.value = data.reduce<{ [name: string]: IUsedCredential }>((accu, credential) => {
			accu[credential.id] = credential;
			return accu;
		}, {});
	}

	function setWorkflowName(data: { newName: string; setStateDirty: boolean }) {
		if (data.setStateDirty) {
			uiStore.stateIsDirty = true;
		}
		workflow.value.name = data.newName;

		if (
			workflow.value.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID &&
			workflowsById.value[workflow.value.id]
		) {
			workflowsById.value[workflow.value.id].name = data.newName;
		}
	}

	function setWorkflowVersionId(versionId: string) {
		workflow.value.versionId = versionId;
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

	function setWorkflows(workflows: IWorkflowDb[]) {
		workflowsById.value = workflows.reduce<IWorkflowsMap>((acc, workflow: IWorkflowDb) => {
			if (workflow.id) {
				acc[workflow.id] = workflow;
			}
			return acc;
		}, {});
	}

	async function deleteWorkflow(id: string) {
		await makeRestApiRequest(rootStore.restApiContext, 'DELETE', `/workflows/${id}`);
		const { [id]: deletedWorkflow, ...workflows } = workflowsById.value;
		workflowsById.value = workflows;
	}

	function addWorkflow(workflow: IWorkflowDb) {
		workflowsById.value = {
			...workflowsById.value,
			[workflow.id]: {
				...workflowsById.value[workflow.id],
				...deepCopy(workflow),
			},
		};
	}

	function setWorkflowActive(targetWorkflowId: string) {
		uiStore.stateIsDirty = false;
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index === -1) {
			activeWorkflows.value.push(targetWorkflowId);
		}
		if (workflowsById.value[targetWorkflowId]) {
			workflowsById.value[targetWorkflowId].active = true;
		}
		if (targetWorkflowId === workflow.value.id) {
			setActive(true);
		}
	}

	function setWorkflowInactive(targetWorkflowId: string) {
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index !== -1) {
			activeWorkflows.value.splice(index, 1);
		}
		if (workflowsById.value[targetWorkflowId]) {
			workflowsById.value[targetWorkflowId].active = false;
		}
		if (targetWorkflowId === workflow.value.id) {
			setActive(false);
		}
	}

	async function fetchActiveWorkflows(): Promise<string[]> {
		const data = await workflowsApi.getActiveWorkflows(rootStore.restApiContext);
		activeWorkflows.value = data;
		return data;
	}

	function setActive(active: boolean) {
		workflow.value.active = active;
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

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
		if (workflowResultData?.data?.waitTill) {
			delete workflowResultData.data.resultData.runData[
				workflowResultData.data.resultData.lastNodeExecuted as string
			];
		}
		workflowExecutionData.value = workflowResultData;
		workflowExecutionPairedItemMappings.value = getPairedItemsMapping(workflowResultData);
	}

	function setWorkflowExecutionRunData(workflowResultData: IRunExecutionData) {
		if (workflowExecutionData.value) {
			workflowExecutionData.value = {
				...workflowExecutionData.value,
				data: workflowResultData,
			};
		}
	}

	function setWorkflowSettings(workflowSettings: IWorkflowSettings) {
		workflow.value = {
			...workflow.value,
			settings: workflowSettings as IWorkflowDb['settings'],
		};
	}

	function setWorkflowPinData(data: IPinData = {}) {
		const validPinData = Object.keys(data).reduce((accu, nodeName) => {
			accu[nodeName] = data[nodeName].map((item) => {
				if (!isJsonKeyObject(item)) {
					return { json: item };
				}

				return item;
			});

			return accu;
		}, {} as IPinData);

		workflow.value.pinData = validPinData;
		updateCachedWorkflow();

		dataPinningEventBus.emit('pin-data', validPinData);
	}

	function setWorkflowTagIds(tags: string[]) {
		workflow.value.tags = tags;
	}

	function addWorkflowTagIds(tags: string[]) {
		workflow.value = {
			...workflow.value,
			tags: [...new Set([...(workflow.value.tags ?? []), ...tags])] as IWorkflowDb['tags'],
		};
	}

	function removeWorkflowTagId(tagId: string) {
		const tags = workflow.value.tags as string[];
		const updated = tags.filter((id: string) => id !== tagId);
		workflow.value = {
			...workflow.value,
			tags: updated as IWorkflowDb['tags'],
		};
	}

	function setWorkflowScopes(scopes: IWorkflowDb['scopes']): void {
		workflow.value.scopes = scopes;
	}

	function setWorkflowMetadata(metadata: WorkflowMetadata | undefined): void {
		workflow.value.meta = metadata;
	}

	function addToWorkflowMetadata(data: Partial<WorkflowMetadata>): void {
		workflow.value.meta = {
			...workflow.value.meta,
			...data,
		};
	}

	function setWorkflow(value: IWorkflowDb): void {
		workflow.value = {
			...value,
			...(!value.hasOwnProperty('active') ? { active: false } : {}),
			...(!value.hasOwnProperty('connections') ? { connections: {} } : {}),
			...(!value.hasOwnProperty('createdAt') ? { createdAt: -1 } : {}),
			...(!value.hasOwnProperty('updatedAt') ? { updatedAt: -1 } : {}),
			...(!value.hasOwnProperty('id') ? { id: PLACEHOLDER_EMPTY_WORKFLOW_ID } : {}),
			...(!value.hasOwnProperty('nodes') ? { nodes: [] } : {}),
			...(!value.hasOwnProperty('settings') ? { settings: { ...defaults.settings } } : {}),
		};
	}

	function pinData(payload: { node: INodeUi; data: INodeExecutionData[] }): void {
		const nodeName = payload.node.name;

		if (!workflow.value.pinData) {
			workflow.value = { ...workflow.value, pinData: {} };
		}

		if (!Array.isArray(payload.data)) {
			payload.data = [payload.data];
		}

		if ((workflow.value.pinData?.[nodeName] ?? []).length > 0 && nodeMetadata.value[nodeName]) {
			// Updating existing pinned data
			nodeMetadata.value[nodeName].pinnedDataLastUpdatedAt = Date.now();
		}

		const storedPinData = payload.data.map((item) =>
			isJsonKeyObject(item) ? { json: item.json } : { json: item },
		);

		workflow.value = {
			...workflow.value,
			pinData: {
				...workflow.value.pinData,
				[nodeName]: storedPinData,
			},
		};

		uiStore.stateIsDirty = true;
		updateCachedWorkflow();

		dataPinningEventBus.emit('pin-data', { [payload.node.name]: storedPinData });
	}

	function unpinData(payload: { node: INodeUi }): void {
		const nodeName = payload.node.name;

		if (!workflow.value.pinData) {
			workflow.value = { ...workflow.value, pinData: {} };
		}

		const { [nodeName]: _, ...pinData } = workflow.value.pinData as IPinData;
		workflow.value = {
			...workflow.value,
			pinData,
		};

		if (nodeMetadata.value[nodeName]) {
			nodeMetadata.value[nodeName].pinnedDataLastRemovedAt = Date.now();
		}

		uiStore.stateIsDirty = true;
		updateCachedWorkflow();

		dataPinningEventBus.emit('unpin-data', {
			nodeNames: [nodeName],
		});
	}

	function addConnection(data: { connection: IConnection[] }): void {
		if (data.connection.length !== 2) {
			// All connections need two entries
			// TODO: Check if there is an error or whatever that is supposed to be returned
			return;
		}

		const sourceData: IConnection = data.connection[0];
		const destinationData: IConnection = data.connection[1];

		// Check if source node and type exist already and if not add them
		if (!workflow.value.connections.hasOwnProperty(sourceData.node)) {
			workflow.value = {
				...workflow.value,
				connections: {
					...workflow.value.connections,
					[sourceData.node]: {},
				},
			};
		}

		if (!workflow.value.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			workflow.value = {
				...workflow.value,
				connections: {
					...workflow.value.connections,
					[sourceData.node]: {
						...workflow.value.connections[sourceData.node],
						[sourceData.type]: [],
					},
				},
			};
		}

		if (
			workflow.value.connections[sourceData.node][sourceData.type].length <
			sourceData.index + 1
		) {
			for (
				let i = workflow.value.connections[sourceData.node][sourceData.type].length;
				i <= sourceData.index;
				i++
			) {
				workflow.value.connections[sourceData.node][sourceData.type].push([]);
			}
		}

		// Check if the same connection exists already
		const checkProperties = ['index', 'node', 'type'] as Array<keyof IConnection>;
		let propertyName: keyof IConnection;
		let connectionExists = false;

		const nodeConnections = workflow.value.connections[sourceData.node][sourceData.type];
		const connectionsToCheck = nodeConnections[sourceData.index];

		if (connectionsToCheck) {
			connectionLoop: for (const existingConnection of connectionsToCheck) {
				for (propertyName of checkProperties) {
					if (existingConnection[propertyName] !== destinationData[propertyName]) {
						continue connectionLoop;
					}
				}
				connectionExists = true;
				break;
			}
		}

		// Add the new connection if it does not exist already
		if (!connectionExists) {
			nodeConnections[sourceData.index] = nodeConnections[sourceData.index] ?? [];
			const connections = nodeConnections[sourceData.index];
			if (connections) {
				connections.push(destinationData);
			}
		}
	}

	function removeConnection(data: { connection: IConnection[] }): void {
		const sourceData = data.connection[0];
		const destinationData = data.connection[1];

		if (!workflow.value.connections.hasOwnProperty(sourceData.node)) {
			return;
		}

		if (!workflow.value.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			return;
		}

		if (
			workflow.value.connections[sourceData.node][sourceData.type].length <
			sourceData.index + 1
		) {
			return;
		}

		uiStore.stateIsDirty = true;

		const connections =
			workflow.value.connections[sourceData.node][sourceData.type][sourceData.index];
		if (!connections) {
			return;
		}

		for (const index in connections) {
			if (
				connections[index].node === destinationData.node &&
				connections[index].type === destinationData.type &&
				connections[index].index === destinationData.index
			) {
				// Found the connection to remove
				connections.splice(parseInt(index, 10), 1);
			}
		}
	}

	function removeAllConnections(data: { setStateDirty: boolean }): void {
		if (data?.setStateDirty) {
			uiStore.stateIsDirty = true;
		}

		workflow.value.connections = {};
	}

	function removeAllNodeConnection(
		node: INodeUi,
		{ preserveInputConnections = false, preserveOutputConnections = false } = {},
	): void {
		uiStore.stateIsDirty = true;

		// Remove all source connections
		if (!preserveOutputConnections) {
			delete workflow.value.connections[node.name];
		}

		// Remove all destination connections
		if (preserveInputConnections) return;

		const indexesToRemove = [];
		let sourceNode: string,
			type: string,
			sourceIndex: string,
			connectionIndex: string,
			connectionData: IConnection;

		for (sourceNode of Object.keys(workflow.value.connections)) {
			for (type of Object.keys(workflow.value.connections[sourceNode])) {
				for (sourceIndex of Object.keys(workflow.value.connections[sourceNode][type])) {
					indexesToRemove.length = 0;
					const connectionsToRemove =
						workflow.value.connections[sourceNode][type][parseInt(sourceIndex, 10)];
					if (connectionsToRemove) {
						for (connectionIndex of Object.keys(connectionsToRemove)) {
							connectionData = connectionsToRemove[parseInt(connectionIndex, 10)];
							if (connectionData.node === node.name) {
								indexesToRemove.push(connectionIndex);
							}
						}
						indexesToRemove.forEach((index) => {
							connectionsToRemove.splice(parseInt(index, 10), 1);
						});
					}
				}
			}
		}
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		uiStore.stateIsDirty = true;

		// If node has any WorkflowResultData rename also that one that the data
		// does still get displayed also after node got renamed
		if (
			workflowExecutionData.value?.data &&
			workflowExecutionData.value.data.resultData.runData.hasOwnProperty(nameData.old)
		) {
			workflowExecutionData.value.data.resultData.runData[nameData.new] =
				workflowExecutionData.value.data.resultData.runData[nameData.old];
			delete workflowExecutionData.value.data.resultData.runData[nameData.old];
		}

		// In case the renamed node was last selected set it also there with the new name
		if (uiStore.lastSelectedNode === nameData.old) {
			uiStore.lastSelectedNode = nameData.new;
		}

		const { [nameData.old]: removed, ...rest } = nodeMetadata.value;
		nodeMetadata.value = { ...rest, [nameData.new]: nodeMetadata.value[nameData.old] };

		if (workflow.value.pinData && workflow.value.pinData.hasOwnProperty(nameData.old)) {
			const { [nameData.old]: renamed, ...restPinData } = workflow.value.pinData;
			workflow.value = {
				...workflow.value,
				pinData: {
					...restPinData,
					[nameData.new]: renamed,
				},
			};
		}
	}

	function setNodes(nodes: INodeUi[]): void {
		workflow.value.nodes = nodes;
		nodes.forEach((node) => {
			if (!node.id) {
				nodeHelpers.assignNodeId(node);
			}

			if (node.extendsCredential) {
				node.type = getCredentialOnlyNodeTypeName(node.extendsCredential);
			}

			if (!nodeMetadata.value[node.name]) {
				nodeMetadata.value[node.name] = { pristine: true };
			}
		});
	}

	function setConnections(connections: IConnections, updateWorkflow = false): void {
		workflow.value.connections = connections;

		if (updateWorkflow) {
			updateCachedWorkflow();
		}
	}

	function resetAllNodesIssues(): boolean {
		workflow.value.nodes.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	/**
	 * @returns `true` if the object was changed
	 */
	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): boolean {
		if (nodeIndex !== -1) {
			const node = workflow.value.nodes[nodeIndex];
			const changed = !isEqual(pick(node, Object.keys(nodeData)), nodeData);
			Object.assign(node, nodeData);
			return changed;
		}
		return false;
	}

	function setNodeIssue(nodeIssueData: INodeIssueData): boolean {
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === nodeIssueData.node;
		});
		if (nodeIndex === -1) {
			return false;
		}

		const node = workflow.value.nodes[nodeIndex];

		if (nodeIssueData.value === null) {
			// Remove the value if one exists
			if (node.issues?.[nodeIssueData.type] === undefined) {
				// No values for type exist so nothing has to get removed
				return true;
			}

			const { [nodeIssueData.type]: removedNodeIssue, ...remainingNodeIssues } = node.issues;
			updateNodeAtIndex(nodeIndex, {
				issues: remainingNodeIssues,
			});
		} else {
			updateNodeAtIndex(nodeIndex, {
				issues: {
					...node.issues,
					[nodeIssueData.type]: nodeIssueData.value as INodeIssueObjectProperty,
				},
			});
		}
		return true;
	}

	function addNode(nodeData: INodeUi): void {
		if (!nodeData.hasOwnProperty('name')) {
			// All nodes have to have a name
			// TODO: Check if there is an error or whatever that is supposed to be returned
			return;
		}

		workflow.value.nodes.push(nodeData);
		// Init node metadata
		if (!nodeMetadata.value[nodeData.name]) {
			nodeMetadata.value[nodeData.name] = {} as INodeMetadata;
		}
	}

	function removeNode(node: INodeUi): void {
		const { [node.name]: removedNodeMetadata, ...remainingNodeMetadata } = nodeMetadata.value;
		nodeMetadata.value = remainingNodeMetadata;

		// If chat trigger node is removed, close chat
		if (node.type === CHAT_TRIGGER_NODE_TYPE && !settingsStore.isNewLogsEnabled) {
			toggleLogsPanelOpen(false);
		}

		if (workflow.value.pinData && workflow.value.pinData.hasOwnProperty(node.name)) {
			const { [node.name]: removedPinData, ...remainingPinData } = workflow.value.pinData;
			workflow.value = {
				...workflow.value,
				pinData: remainingPinData,
			};
		}

		for (let i = 0; i < workflow.value.nodes.length; i++) {
			if (workflow.value.nodes[i].name === node.name) {
				workflow.value = {
					...workflow.value,
					nodes: [...workflow.value.nodes.slice(0, i), ...workflow.value.nodes.slice(i + 1)],
				};

				uiStore.stateIsDirty = true;
				return;
			}
		}
	}

	function removeAllNodes(data: { setStateDirty: boolean; removePinData: boolean }): void {
		if (data.setStateDirty) {
			uiStore.stateIsDirty = true;
		}

		if (data.removePinData) {
			workflow.value = {
				...workflow.value,
				pinData: {},
			};
		}

		workflow.value.nodes.splice(0, workflow.value.nodes.length);
		nodeMetadata.value = {};
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		// Find the node that should be updated
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex !== -1) {
			for (const key of Object.keys(updateInformation.properties)) {
				uiStore.stateIsDirty = true;

				const typedKey = key as keyof INodeUpdatePropertiesInformation['properties'];
				const property = updateInformation.properties[typedKey];

				updateNodeAtIndex(nodeIndex, { [key]: property });
			}
		}
	}

	function setNodeValue(updateInformation: IUpdateInformation): void {
		// Find the node that should be updated
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex === -1 || !updateInformation.key) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const changed = updateNodeAtIndex(nodeIndex, {
			[updateInformation.key]: updateInformation.value,
		});

		uiStore.stateIsDirty = uiStore.stateIsDirty || changed;

		const excludeKeys = ['position', 'notes', 'notesInFlow'];

		if (!excludeKeys.includes(updateInformation.key)) {
			nodeMetadata.value[workflow.value.nodes[nodeIndex].name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
		// Find the node that should be updated
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex === -1) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const node = workflow.value.nodes[nodeIndex];

		uiStore.stateIsDirty = true;
		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...node.parameters, ...updateInformation.value }
				: updateInformation.value;

		updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		nodeMetadata.value[node.name].parametersLastUpdatedAt = Date.now();
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(
			workflow.value.nodes,
			(node) => node.type === updateInformation.key,
		) as INodeUi;
		const nodeType = useNodeTypesStore().getNodeType(latestNode.type);
		if (!nodeType) return;

		const nodeParams = NodeHelpers.getNodeParameters(
			nodeType.properties,
			updateInformation.value as INodeParameters,
			true,
			false,
			latestNode,
			nodeType,
		);

		if (latestNode) {
			setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
		}
	}

	async function trackNodeExecution(pushData: PushPayload<'nodeExecuteAfter'>): Promise<void> {
		const nodeName = pushData.nodeName;

		if (pushData.data.error) {
			const node = getNodeByName(nodeName);
			telemetry.track(
				'Manual exec errored',
				{
					error_title: pushData.data.error.message,
					node_type: node?.type,
					node_type_version: node?.typeVersion,
					node_id: node?.id,
					node_graph_string: JSON.stringify(
						TelemetryHelpers.generateNodesGraph(
							await workflowHelpers.getWorkflowDataToSave(),
							workflowHelpers.getNodeTypes(),
							{
								isCloudDeployment: settingsStore.isCloudDeployment,
							},
						).nodeGraph,
					),
				},
				{ withPostHog: true },
			);
		}
	}

	function getFormResumeUrl(node: INode, executionId: string) {
		const { webhookSuffix } = (node.parameters.options ?? {}) as IDataObject;
		const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';
		const testUrl = `${rootStore.formWaitingUrl}/${executionId}${suffix}`;
		return testUrl;
	}

	function setNodeExecuting(pushData: PushPayload<'nodeExecuteBefore'>): void {
		addExecutingNode(pushData.nodeName);

		if (settingsStore.isNewLogsEnabled) {
			const node = getNodeByName(pushData.nodeName);

			if (!node || !workflowExecutionData.value?.data) {
				return;
			}

			if (workflowExecutionData.value.data.resultData.runData[pushData.nodeName] === undefined) {
				workflowExecutionData.value.data.resultData.runData[pushData.nodeName] = [];
			}

			workflowExecutionData.value.data.resultData.runData[pushData.nodeName].push({
				executionStatus: 'running',
				executionTime: 0,
				...pushData.data,
			});
		}
	}

	function updateNodeExecutionData(pushData: PushPayload<'nodeExecuteAfter'>): void {
		if (!workflowExecutionData.value?.data) {
			throw new Error('The "workflowExecutionData" is not initialized!');
		}

		const { nodeName, data, executionId } = pushData;
		const isNodeWaiting = data.executionStatus === 'waiting';
		const node = getNodeByName(nodeName);
		if (!node) return;

		if (workflowExecutionData.value.data.resultData.runData[nodeName] === undefined) {
			workflowExecutionData.value = {
				...workflowExecutionData.value,
				data: {
					...workflowExecutionData.value.data,
					resultData: {
						...workflowExecutionData.value.data.resultData,
						runData: {
							...workflowExecutionData.value.data.resultData.runData,
							[nodeName]: [],
						},
					},
				},
			};
		}

		const tasksData = workflowExecutionData.value.data!.resultData.runData[nodeName];
		if (isNodeWaiting) {
			tasksData.push(data);
			if (
				node.type === FORM_NODE_TYPE ||
				(node.type === WAIT_NODE_TYPE && node.parameters.resume === 'form')
			) {
				const testUrl = getFormResumeUrl(node, executionId);
				openFormPopupWindow(testUrl);
			}
		} else {
			const status = tasksData[tasksData.length - 1]?.executionStatus ?? 'unknown';

			if ('waiting' === status || (settingsStore.isNewLogsEnabled && 'running' === status)) {
				tasksData.splice(tasksData.length - 1, 1, data);
			} else {
				tasksData.push(data);
			}

			removeExecutingNode(nodeName);
			void trackNodeExecution(pushData);
		}
	}

	function clearNodeExecutionData(nodeName: string): void {
		if (!workflowExecutionData.value?.data) {
			return;
		}

		const { [nodeName]: removedRunData, ...remainingRunData } =
			workflowExecutionData.value.data.resultData.runData;
		workflowExecutionData.value = {
			...workflowExecutionData.value,
			data: {
				...workflowExecutionData.value.data,
				resultData: {
					...workflowExecutionData.value.data.resultData,
					runData: remainingRunData,
				},
			},
		};
	}

	function pinDataByNodeName(nodeName: string): INodeExecutionData[] | undefined {
		if (!workflow.value.pinData?.[nodeName]) return undefined;

		return workflow.value.pinData[nodeName].map((item) => item.json) as INodeExecutionData[];
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
	async function createNewWorkflow(sendData: IWorkflowDataCreate): Promise<IWorkflowDb> {
		// make sure that the new ones are not active
		sendData.active = false;

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
		data: IWorkflowDataUpdate,
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

	async function runWorkflow(startRunData: IStartRunData): Promise<IExecutionPushResponse> {
		if (startRunData.workflowData.settings === null) {
			startRunData.workflowData.settings = undefined;
		}

		try {
			return await makeRestApiRequest(
				rootStore.restApiContext,
				'POST',
				`/workflows/${startRunData.workflowData.id}/run?partialExecutionVersion=${version.value}`,
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

	async function fetchExecutionDataById(executionId: string): Promise<IExecutionResponse | null> {
		return await workflowsApi.getExecutionData(rootStore.restApiContext, executionId);
	}

	function deleteExecution(execution: ExecutionSummary): void {
		currentWorkflowExecutions.value.splice(currentWorkflowExecutions.value.indexOf(execution), 1);
	}

	function addToCurrentExecutions(executions: ExecutionSummary[]): void {
		executions.forEach((execution) => {
			const exists = currentWorkflowExecutions.value.find((ex) => ex.id === execution.id);
			if (!exists && execution.workflowId === workflowId.value) {
				currentWorkflowExecutions.value.push(execution);
			}
		});
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

	function setNodePristine(nodeName: string, isPristine: boolean): void {
		nodeMetadata.value[nodeName].pristine = isPristine;
	}

	function resetChatMessages(): void {
		chatMessages.value = [];
	}

	function appendChatMessage(message: string): void {
		chatMessages.value.push(message);
	}

	function checkIfNodeHasChatParent(nodeName: string): boolean {
		const workflow = getCurrentWorkflow();
		const parents = workflow.getParentNodes(nodeName, NodeConnectionTypes.Main);

		const matchedChatNode = parents.find((parent) => {
			const parentNodeType = getNodeByName(parent)?.type;

			return parentNodeType === CHAT_TRIGGER_NODE_TYPE;
		});

		return !!matchedChatNode;
	}

	//
	// Start Canvas V2 Functions
	//

	function removeNodeById(nodeId: string): void {
		const node = getNodeById(nodeId);
		if (!node) {
			return;
		}

		removeNode(node);
	}

	function removeNodeConnectionsById(nodeId: string): void {
		const node = getNodeById(nodeId);
		if (!node) {
			return;
		}

		removeAllNodeConnection(node);
	}

	function removeNodeExecutionDataById(nodeId: string): void {
		const node = getNodeById(nodeId);
		if (!node) {
			return;
		}

		clearNodeExecutionData(node.name);
	}

	//
	// End Canvas V2 Functions
	//

	function toggleLogsPanelOpen(isOpen?: boolean) {
		isLogsPanelOpen.value = isOpen ?? !isLogsPanelOpen.value;
	}

	function setPreferPoppedOutLogsView(value: boolean) {
		preferPopOutLogsView.value = value;
	}

	function markExecutionAsStopped() {
		setActiveExecutionId(null);
		clearNodeExecutionQueue();
		executionWaitingForWebhook.value = false;
		uiStore.removeActiveAction('workflowRunning');
		workflowHelpers.setDocumentTitle(workflowName.value, 'IDLE');

		clearPopupWindowState();

		const runData = workflowExecutionData.value?.data?.resultData.runData ?? {};
		for (const nodeName in runData) {
			runData[nodeName] = runData[nodeName].filter(
				({ executionStatus }) => executionStatus === 'success',
			);
		}
	}

	return {
		workflow,
		usedCredentials,
		activeWorkflows,
		activeWorkflowExecution,
		currentWorkflowExecutions,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		activeExecutionId: computed(() => activeExecutionId.value),
		previousExecutionId: computed(() => previousExecutionId.value),
		setActiveExecutionId,
		subWorkflowExecutionError,
		executionWaitingForWebhook,
		executingNode,
		workflowsById,
		nodeMetadata,
		isInDebugMode,
		chatMessages,
		chatPartialExecutionDestinationNode,
		workflowName,
		workflowId,
		workflowVersionId,
		workflowSettings,
		workflowTags,
		allWorkflows,
		isNewWorkflow,
		isWorkflowActive,
		workflowTriggerNodes,
		currentWorkflowHasWebhookNode,
		getWorkflowRunData,
		getWorkflowResultDataByNodeName,
		allConnections,
		allNodes,
		isWaitingExecution,
		isWorkflowRunning,
		canvasNames,
		nodesByName,
		nodesIssuesExist,
		pinnedWorkflowData,
		shouldReplaceInputDataWithPinData,
		executedNode,
		getAllLoadedFinishedExecutions,
		getWorkflowExecution,
		getPastChatMessages,
		logsPanelState: computed(() => logsPanelState.value),
		toggleLogsPanelOpen,
		setPreferPoppedOutLogsView,
		outgoingConnectionsByNodeName,
		incomingConnectionsByNodeName,
		nodeHasOutputConnection,
		isNodeInOutgoingNodeConnections,
		getWorkflowById,
		getNodeByName,
		getNodeById,
		getNodesByIds,
		getParametersLastUpdate,
		getPinnedDataLastUpdate,
		getPinnedDataLastRemovedAt,
		isNodePristine,
		isNodeExecuting,
		getExecutionDataById,
		getPinDataSize,
		getNodeTypes,
		getNodes,
		convertTemplateNodeToNodeUi,
		getWorkflow,
		getCurrentWorkflow,
		getWorkflowFromUrl,
		getActivationError,
		fetchAllWorkflows,
		fetchWorkflowsPage,
		fetchWorkflow,
		getNewWorkflowData,
		makeNewWorkflowShareable,
		resetWorkflow,
		resetState,
		setNodeExecuting,
		removeExecutingNode,
		setWorkflowId,
		setUsedCredentials,
		setWorkflowName,
		setWorkflowVersionId,
		replaceInvalidWorkflowCredentials,
		setWorkflows,
		deleteWorkflow,
		addWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		fetchActiveWorkflows,
		setActive,
		getDuplicateCurrentWorkflowName,
		setWorkflowExecutionData,
		setWorkflowExecutionRunData,
		setWorkflowSettings,
		setWorkflowPinData,
		setWorkflowTagIds,
		addWorkflowTagIds,
		removeWorkflowTagId,
		setWorkflowScopes,
		setWorkflowMetadata,
		addToWorkflowMetadata,
		setWorkflow,
		pinData,
		unpinData,
		addConnection,
		removeConnection,
		removeAllConnections,
		removeAllNodeConnection,
		renameNodeSelectedAndExecution,
		resetAllNodesIssues,
		updateNodeAtIndex,
		setNodeIssue,
		addNode,
		removeNode,
		removeAllNodes,
		updateNodeProperties,
		setNodeValue,
		setNodeParameters,
		setLastNodeParameters,
		updateNodeExecutionData,
		clearNodeExecutionData,
		pinDataByNodeName,
		activeNode,
		getPastExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		runWorkflow,
		removeTestWebhook,
		fetchExecutionDataById,
		deleteExecution,
		addToCurrentExecutions,
		getBinaryUrl,
		setNodePristine,
		resetChatMessages,
		appendChatMessage,
		checkIfNodeHasChatParent,
		setNodePositionById,
		removeNodeById,
		removeNodeConnectionsById,
		removeNodeExecutionDataById,
		setNodes,
		setConnections,
		markExecutionAsStopped,
		totalWorkflowCount,
	};
});
