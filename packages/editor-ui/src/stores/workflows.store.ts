import {
	CHAT_TRIGGER_NODE_TYPE,
	DEFAULT_NEW_WORKFLOW_NAME,
	DUPLICATE_POSTFFIX,
	ERROR_TRIGGER_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	STORES,
} from '@/constants';
import type {
	ExecutionsQueryFilter,
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	IExecutionsListResponse,
	INewWorkflowData,
	INodeMetadata,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IPushDataExecutionFinished,
	IPushDataNodeExecuteAfter,
	IPushDataUnsavedExecutionFinished,
	IStartRunData,
	IUpdateInformation,
	IUsedCredential,
	IWorkflowDataUpdate,
	IWorkflowDb,
	IWorkflowsMap,
	NodeMetadataMap,
	WorkflowMetadata,
	IExecutionFlattedResponse,
} from '@/Interface';
import { defineStore } from 'pinia';
import type {
	IAbstractEventMessage,
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
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	INodeType,
} from 'n8n-workflow';
import { deepCopy, NodeHelpers, Workflow } from 'n8n-workflow';
import { findLast } from 'lodash-es';

import { useRootStore } from '@/stores/n8nRoot.store';
import * as workflowsApi from '@/api/workflows';
import { useUIStore } from '@/stores/ui.store';
import { dataPinningEventBus } from '@/event-bus';
import { isObject } from '@/utils/objectUtils';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import { isJsonKeyObject, isEmpty, stringSizeInBytes } from '@/utils/typesUtils';
import { makeRestApiRequest, unflattenExecutionData, ResponseError } from '@/utils/apiUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getCredentialOnlyNodeTypeName } from '@/utils/credentialOnlyNodes';
import { i18n } from '@/plugins/i18n';

import { computed, ref } from 'vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useSettingsStore } from './settings.store';
import { useUsersStore } from './users.store';

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
	const workflow = ref<IWorkflowDb>(createEmptyWorkflow());
	const usedCredentials = ref<Record<string, IUsedCredential>>({});

	const activeWorkflows = ref<string[]>([]);
	const activeExecutions = ref<IExecutionsCurrentSummaryExtended[]>([]);
	const activeWorkflowExecution = ref<ExecutionSummary | null>(null);
	const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
	const finishedExecutionsCount = ref(0);
	const workflowExecutionData = ref<IExecutionResponse | null>(null);
	const workflowExecutionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const activeExecutionId = ref<string | null>(null);
	const subWorkflowExecutionError = ref<Error | null>(null);
	const executionWaitingForWebhook = ref(false);
	const executingNode = ref<string[]>([]);
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const nodeMetadata = ref<NodeMetadataMap>({});
	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);

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
			if (node.issues === undefined || Object.keys(node.issues).length === 0) {
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

	const getTotalFinishedExecutionsCount = computed(() => finishedExecutionsCount.value);

	const getPastChatMessages = computed(() => Array.from(new Set(chatMessages.value)));

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

	function getParametersLastUpdate(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.parametersLastUpdatedAt;
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
			// @ts-ignore
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
		const rootStore = useRootStore();
		return await makeRestApiRequest(rootStore.getRestApiContext, 'GET', '/workflows/from-url', {
			url,
		});
	}

	async function getActivationError(id: string): Promise<string | undefined> {
		const rootStore = useRootStore();
		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'GET',
			`/active-workflows/error/${id}`,
		);
	}

	async function fetchAllWorkflows(projectId?: string): Promise<IWorkflowDb[]> {
		const rootStore = useRootStore();

		const filter = {
			projectId,
		};

		const workflows = await workflowsApi.getWorkflows(
			rootStore.getRestApiContext,
			isEmpty(filter) ? undefined : filter,
		);
		setWorkflows(workflows);
		return workflows;
	}

	async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
		const rootStore = useRootStore();
		const workflow = await workflowsApi.getWorkflow(rootStore.getRestApiContext, id);
		addWorkflow(workflow);
		return workflow;
	}

	async function getNewWorkflowData(name?: string, projectId?: string): Promise<INewWorkflowData> {
		let workflowData = {
			name: '',
			onboardingFlowEnabled: false,
			settings: { ...defaults.settings },
		};
		try {
			const rootStore = useRootStore();

			const data: IDataObject = {
				name,
				projectId,
			};

			workflowData = await workflowsApi.getNewWorkflow(
				rootStore.getRestApiContext,
				isEmpty(data) ? undefined : data,
			);
		} catch (e) {
			// in case of error, default to original name
			workflowData.name = name || DEFAULT_NEW_WORKFLOW_NAME;
		}

		setWorkflowName({ newName: workflowData.name, setStateDirty: false });

		return workflowData;
	}

	function resetWorkflow() {
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
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

		activeExecutionId.value = null;
		executingNode.value.length = 0;
		executionWaitingForWebhook.value = false;
	}

	function addExecutingNode(nodeName: string) {
		executingNode.value.push(nodeName);
	}

	function removeExecutingNode(nodeName: string) {
		executingNode.value = executingNode.value.filter((name) => name !== nodeName);
	}

	function setWorkflowId(id: string) {
		workflow.value.id = id === 'new' ? PLACEHOLDER_EMPTY_WORKFLOW_ID : id;
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
			const uiStore = useUIStore();
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
		const rootStore = useRootStore();
		await makeRestApiRequest(rootStore.getRestApiContext, 'DELETE', `/workflows/${id}`);
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
		const uiStore = useUIStore();
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
		const rootStore = useRootStore();
		const data = await workflowsApi.getActiveWorkflows(rootStore.getRestApiContext);
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
			const rootStore = useRootStore();
			const newWorkflow = await workflowsApi.getNewWorkflow(rootStore.getRestApiContext, {
				name: newName,
			});
			newName = newWorkflow.name;
		} catch (e) {}
		return newName;
	}

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
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

	function setWorkflowPinData(pinData: IPinData) {
		workflow.value = {
			...workflow.value,
			pinData: pinData || {},
		};

		dataPinningEventBus.emit('pin-data', pinData || {});
	}

	function setWorkflowTagIds(tags: string[]) {
		workflow.value = {
			...workflow.value,
			tags,
		};
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
		if (!workflow.value.pinData) {
			workflow.value = { ...workflow.value, pinData: {} };
		}

		if (!Array.isArray(payload.data)) {
			payload.data = [payload.data];
		}

		const storedPinData = payload.data.map((item) =>
			isJsonKeyObject(item) ? { json: item.json } : { json: item },
		);

		workflow.value = {
			...workflow.value,
			pinData: {
				...workflow.value.pinData,
				[payload.node.name]: storedPinData,
			},
		};

		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;

		dataPinningEventBus.emit('pin-data', { [payload.node.name]: storedPinData });
	}

	function unpinData(payload: { node: INodeUi }): void {
		if (!workflow.value.pinData) {
			workflow.value = { ...workflow.value, pinData: {} };
		}

		const { [payload.node.name]: _, ...pinData } = workflow.value.pinData as IPinData;
		workflow.value = {
			...workflow.value,
			pinData,
		};

		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;

		dataPinningEventBus.emit('unpin-data', { [payload.node.name]: undefined });
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

		connectionLoop: for (const existingConnection of workflow.value.connections[sourceData.node][
			sourceData.type
		][sourceData.index]) {
			for (propertyName of checkProperties) {
				if (existingConnection[propertyName] !== destinationData[propertyName]) {
					continue connectionLoop;
				}
			}
			connectionExists = true;
			break;
		}

		// Add the new connection if it does not exist already
		if (!connectionExists) {
			workflow.value.connections[sourceData.node][sourceData.type][sourceData.index].push(
				destinationData,
			);
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

		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;

		const connections =
			workflow.value.connections[sourceData.node][sourceData.type][sourceData.index];
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
		if (data && data.setStateDirty) {
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;
		}

		workflow.value.connections = {};
	}

	function removeAllNodeConnection(
		node: INodeUi,
		{ preserveInputConnections = false, preserveOutputConnections = false } = {},
	): void {
		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;

		// Remove all source connections
		if (!preserveOutputConnections && workflow.value.connections.hasOwnProperty(node.name)) {
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
					for (connectionIndex of Object.keys(
						workflow.value.connections[sourceNode][type][parseInt(sourceIndex, 10)],
					)) {
						connectionData =
							workflow.value.connections[sourceNode][type][parseInt(sourceIndex, 10)][
								parseInt(connectionIndex, 10)
							];
						if (connectionData.node === node.name) {
							indexesToRemove.push(connectionIndex);
						}
					}
					indexesToRemove.forEach((index) => {
						workflow.value.connections[sourceNode][type][parseInt(sourceIndex, 10)].splice(
							parseInt(index, 10),
							1,
						);
					});
				}
			}
		}
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		const uiStore = useUIStore();
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

	function resetAllNodesIssues(): boolean {
		workflow.value.nodes.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): void {
		if (nodeIndex !== -1) {
			const node = workflow.value.nodes[nodeIndex];
			workflow.value = {
				...workflow.value,
				nodes: [
					...workflow.value.nodes.slice(0, nodeIndex),
					{ ...node, ...nodeData },
					...workflow.value.nodes.slice(nodeIndex + 1),
				],
			};
		}
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
			if (node.issues === undefined) {
				updateNodeAtIndex(nodeIndex, {
					issues: {},
				});
			}

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

		if (nodeData.extendsCredential) {
			nodeData.type = getCredentialOnlyNodeTypeName(nodeData.extendsCredential);
		}

		workflow.value.nodes.push(nodeData);
		// Init node metadata
		if (!nodeMetadata.value[nodeData.name]) {
			nodeMetadata.value = { ...nodeMetadata.value, [nodeData.name]: {} as INodeMetadata };
		}
	}

	function removeNode(node: INodeUi): void {
		const uiStore = useUIStore();
		const { [node.name]: removedNodeMetadata, ...remainingNodeMetadata } = nodeMetadata.value;
		nodeMetadata.value = remainingNodeMetadata;

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
			const uiStore = useUIStore();
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
				const uiStore = useUIStore();
				uiStore.stateIsDirty = true;

				updateNodeAtIndex(nodeIndex, {
					[key]: updateInformation.properties[key],
				});
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

		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;

		updateNodeAtIndex(nodeIndex, {
			[updateInformation.key]: updateInformation.value,
		});
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

		const uiStore = useUIStore();
		uiStore.stateIsDirty = true;
		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...node.parameters, ...updateInformation.value }
				: updateInformation.value;

		updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		nodeMetadata.value = {
			...nodeMetadata.value,
			[node.name]: {
				...nodeMetadata.value[node.name],
				parametersLastUpdatedAt: Date.now(),
			},
		} as NodeMetadataMap;
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
		);

		if (latestNode) {
			setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
		}
	}

	function addNodeExecutionData(pushData: IPushDataNodeExecuteAfter): void {
		if (!workflowExecutionData.value?.data) {
			throw new Error('The "workflowExecutionData" is not initialized!');
		}

		if (workflowExecutionData.value.data.resultData.runData[pushData.nodeName] === undefined) {
			workflowExecutionData.value = {
				...workflowExecutionData.value,
				data: {
					...workflowExecutionData.value.data,
					resultData: {
						...workflowExecutionData.value.data.resultData,
						runData: {
							...workflowExecutionData.value.data.resultData.runData,
							[pushData.nodeName]: [],
						},
					},
				},
			};
		}
		workflowExecutionData.value.data!.resultData.runData[pushData.nodeName].push(pushData.data);
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

	function addActiveExecution(newActiveExecution: IExecutionsCurrentSummaryExtended): void {
		// Check if the execution exists already
		const activeExecution = activeExecutions.value.find((execution) => {
			return execution.id === newActiveExecution.id;
		});

		if (activeExecution !== undefined) {
			// Exists already so no need to add it again
			if (activeExecution.workflowName === undefined) {
				activeExecution.workflowName = newActiveExecution.workflowName;
			}
			return;
		}

		activeExecutions.value.unshift(newActiveExecution);
		activeExecutionId.value = newActiveExecution.id;
	}

	function finishActiveExecution(
		finishedActiveExecution: IPushDataExecutionFinished | IPushDataUnsavedExecutionFinished,
	): void {
		// Find the execution to set to finished
		const activeExecutionIndex = activeExecutions.value.findIndex((execution) => {
			return execution.id === finishedActiveExecution.executionId;
		});

		if (activeExecutionIndex === -1) {
			// The execution could not be found
			return;
		}

		const activeExecution = activeExecutions.value[activeExecutionIndex];

		activeExecutions.value = [
			...activeExecutions.value.slice(0, activeExecutionIndex),
			{
				...activeExecution,
				...(finishedActiveExecution.executionId !== undefined
					? { id: finishedActiveExecution.executionId }
					: {}),
				finished: finishedActiveExecution.data.finished,
				stoppedAt: finishedActiveExecution.data.stoppedAt,
			},
			...activeExecutions.value.slice(activeExecutionIndex + 1),
		];

		if (finishedActiveExecution.data && (finishedActiveExecution.data as IRun).data) {
			setWorkflowExecutionRunData((finishedActiveExecution.data as IRun).data);
		}
	}

	function setActiveExecutions(newActiveExecutions: IExecutionsCurrentSummaryExtended[]): void {
		activeExecutions.value = newActiveExecutions;
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
		const rootStore = useRootStore();
		return await makeRestApiRequest(rootStore.getRestApiContext, 'GET', '/executions', sendData);
	}

	async function getActiveExecutions(
		filter: IDataObject,
	): Promise<IExecutionsCurrentSummaryExtended[]> {
		let sendData = {};
		if (filter) {
			sendData = {
				filter,
			};
		}
		const rootStore = useRootStore();
		const output = await makeRestApiRequest<{ results: IExecutionsCurrentSummaryExtended[] }>(
			rootStore.getRestApiContext,
			'GET',
			'/executions',
			sendData,
		);

		return output.results;
	}

	async function getExecution(id: string): Promise<IExecutionResponse | undefined> {
		const rootStore = useRootStore();
		const response = await makeRestApiRequest<IExecutionFlattedResponse | undefined>(
			rootStore.getRestApiContext,
			'GET',
			`/executions/${id}`,
		);

		return response && unflattenExecutionData(response);
	}

	async function createNewWorkflow(sendData: IWorkflowDataUpdate): Promise<IWorkflowDb> {
		// make sure that the new ones are not active
		sendData.active = false;

		const rootStore = useRootStore();
		const projectStore = useProjectsStore();

		if (projectStore.currentProjectId) {
			(sendData as unknown as IDataObject).projectId = projectStore.currentProjectId;
		}

		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'POST',
			'/workflows',
			sendData as unknown as IDataObject,
		);
	}

	async function updateWorkflow(
		id: string,
		data: IWorkflowDataUpdate,
		forceSave = false,
	): Promise<IWorkflowDb> {
		const rootStore = useRootStore();

		if (data.settings === null) {
			data.settings = undefined;
		}

		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'PATCH',
			`/workflows/${id}${forceSave ? '?forceSave=true' : ''}`,
			data as unknown as IDataObject,
		);
	}

	async function runWorkflow(startRunData: IStartRunData): Promise<IExecutionPushResponse> {
		const rootStore = useRootStore();

		if (startRunData.workflowData.settings === null) {
			startRunData.workflowData.settings = undefined;
		}

		try {
			return await makeRestApiRequest(
				rootStore.getRestApiContext,
				'POST',
				`/workflows/${startRunData.workflowData.id}/run`,
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
		const rootStore = useRootStore();
		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'DELETE',
			`/test-webhook/${targetWorkflowId}`,
		);
	}

	async function loadCurrentWorkflowExecutions(
		requestFilter: ExecutionsQueryFilter,
	): Promise<ExecutionSummary[]> {
		let retrievedActiveExecutions: IExecutionsCurrentSummaryExtended[] = [];

		if (!requestFilter.workflowId) {
			return [];
		}

		try {
			const rootStore = useRootStore();
			if ((!requestFilter.status || !requestFilter.finished) && isEmpty(requestFilter.metadata)) {
				retrievedActiveExecutions = await workflowsApi.getActiveExecutions(
					rootStore.getRestApiContext,
					{
						workflowId: requestFilter.workflowId,
					},
				);
			}
			const retrievedFinishedExecutions = await workflowsApi.getExecutions(
				rootStore.getRestApiContext,
				requestFilter,
			);
			finishedExecutionsCount.value = retrievedFinishedExecutions.count;
			return [...retrievedActiveExecutions, ...(retrievedFinishedExecutions.results || [])];
		} catch (error) {
			throw error;
		}
	}

	async function fetchExecutionDataById(executionId: string): Promise<IExecutionResponse | null> {
		const rootStore = useRootStore();
		return await workflowsApi.getExecutionData(rootStore.getRestApiContext, executionId);
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

	async function getExecutionEvents(id: string): Promise<IAbstractEventMessage[]> {
		const rootStore = useRootStore();
		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'GET',
			`/eventbus/execution/${id}`,
		);
	}

	function getBinaryUrl(
		binaryDataId: string,
		action: 'view' | 'download',
		fileName: string,
		mimeType: string,
	): string {
		const rootStore = useRootStore();
		let restUrl = rootStore.getRestUrl;
		if (restUrl.startsWith('/')) restUrl = window.location.origin + restUrl;
		const url = new URL(`${restUrl}/binary-data`);
		url.searchParams.append('id', binaryDataId);
		url.searchParams.append('action', action);
		if (fileName) url.searchParams.append('fileName', fileName);
		if (mimeType) url.searchParams.append('mimeType', mimeType);
		return url.toString();
	}

	function setNodePristine(nodeName: string, isPristine: boolean): void {
		nodeMetadata.value = {
			...nodeMetadata.value,
			[nodeName]: {
				...nodeMetadata.value[nodeName],
				pristine: isPristine,
			},
		};
	}

	function resetChatMessages(): void {
		chatMessages.value = [];
	}

	function appendChatMessage(message: string): void {
		chatMessages.value.push(message);
	}

	function checkIfNodeHasChatParent(nodeName: string): boolean {
		const workflow = getCurrentWorkflow();
		const parents = workflow.getParentNodes(nodeName, 'main');

		const matchedChatNode = parents.find((parent) => {
			const parentNodeType = getNodeByName(parent)?.type;

			return parentNodeType === CHAT_TRIGGER_NODE_TYPE;
		});

		return !!matchedChatNode;
	}

	return {
		workflow,
		usedCredentials,
		activeWorkflows,
		activeExecutions,
		activeWorkflowExecution,
		currentWorkflowExecutions,
		finishedExecutionsCount,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		activeExecutionId,
		subWorkflowExecutionError,
		executionWaitingForWebhook,
		executingNode,
		workflowsById,
		nodeMetadata,
		isInDebugMode,
		chatMessages,
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
		canvasNames,
		nodesByName,
		nodesIssuesExist,
		pinnedWorkflowData,
		shouldReplaceInputDataWithPinData,
		executedNode,
		getAllLoadedFinishedExecutions,
		getWorkflowExecution,
		getTotalFinishedExecutionsCount,
		getPastChatMessages,
		outgoingConnectionsByNodeName,
		nodeHasOutputConnection,
		isNodeInOutgoingNodeConnections,
		getWorkflowById,
		getNodeByName,
		getNodeById,
		getParametersLastUpdate,
		isNodePristine,
		isNodeExecuting,
		getExecutionDataById,
		getPinDataSize,
		getNodeTypes,
		getNodes,
		getWorkflow,
		getCurrentWorkflow,
		getWorkflowFromUrl,
		getActivationError,
		fetchAllWorkflows,
		fetchWorkflow,
		getNewWorkflowData,
		resetWorkflow,
		resetState,
		addExecutingNode,
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
		addNodeExecutionData,
		clearNodeExecutionData,
		pinDataByNodeName,
		activeNode,
		addActiveExecution,
		finishActiveExecution,
		setActiveExecutions,
		getPastExecutions,
		getActiveExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		runWorkflow,
		removeTestWebhook,
		loadCurrentWorkflowExecutions,
		fetchExecutionDataById,
		deleteExecution,
		addToCurrentExecutions,
		getExecutionEvents,
		getBinaryUrl,
		setNodePristine,
		resetChatMessages,
		appendChatMessage,
		checkIfNodeHasChatParent,
	};
});
