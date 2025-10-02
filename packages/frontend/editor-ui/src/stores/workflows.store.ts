import {
	AI_NODES_PACKAGE_NAME,
	CHAT_TRIGGER_NODE_TYPE,
	DEFAULT_NEW_WORKFLOW_NAME,
	DEFAULT_WORKFLOW_PAGE_SIZE,
	DUPLICATE_POSTFFIX,
	ERROR_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/constants';
import { STORES } from '@n8n/stores';
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
	IWorkflowDb,
	IWorkflowsMap,
	NodeMetadataMap,
	IExecutionFlattedResponse,
	WorkflowListResource,
	IExecutionsStopData,
} from '@/Interface';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type {
	WorkflowMetadata,
	WorkflowDataCreate,
	WorkflowDataUpdate,
} from '@n8n/rest-api-client/api/workflows';
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
	ITaskStartedData,
} from 'n8n-workflow';
import {
	deepCopy,
	NodeConnectionTypes,
	NodeHelpers,
	SEND_AND_WAIT_OPERATION,
	Workflow,
	TelemetryHelpers,
} from 'n8n-workflow';
import * as workflowUtils from 'n8n-workflow/common';
import findLast from 'lodash/findLast';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/api/workflows';
import { useUIStore } from '@/stores/ui.store';
import { dataPinningEventBus } from '@/event-bus';
import { isObject } from '@/utils/objectUtils';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import { isJsonKeyObject, isEmpty, stringSizeInBytes, isPresent } from '@/utils/typesUtils';
import { makeRestApiRequest, ResponseError } from '@n8n/rest-api-client';
import {
	unflattenExecutionData,
	clearPopupWindowState,
	findTriggerNodeToAutoSelect,
	openFormPopupWindow,
} from '@/utils/executionUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getCredentialOnlyNodeTypeName } from '@/utils/credentialOnlyNodes';
import { i18n } from '@n8n/i18n';

import { computed, ref, watch } from 'vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useSettingsStore } from './settings.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useUsersStore } from '@/stores/users.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { useExecutingNode } from '@/composables/useExecutingNode';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { isChatNode } from '@/utils/aiUtils';
import { snapPositionToGrid } from '@/utils/nodeViewUtils';

const defaults: Omit<IWorkflowDb, 'id'> & { settings: NonNullable<IWorkflowDb['settings']> } = {
	name: '',
	active: false,
	isArchived: false,
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

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const workflowHelpers = useWorkflowHelpers();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeHelpers = useNodeHelpers();
	const usersStore = useUsersStore();
	const nodeTypesStore = useNodeTypesStore();

	const workflow = ref<IWorkflowDb>(createEmptyWorkflow());
	const workflowObject = ref<Workflow>(
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		createWorkflowObject(workflow.value.nodes, workflow.value.connections),
	);

	// For paginated workflow lists
	const totalWorkflowCount = ref(0);
	const usedCredentials = ref<Record<string, IUsedCredential>>({});

	const activeWorkflows = ref<string[]>([]);
	const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
	const workflowExecutionData = ref<IExecutionResponse | null>(null);
	const workflowExecutionStartedData =
		ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
	const workflowExecutionResultDataLastUpdate = ref<number>();
	const workflowExecutionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const subWorkflowExecutionError = ref<Error | null>(null);
	const executionWaitingForWebhook = ref(false);
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const nodeMetadata = ref<NodeMetadataMap>({});
	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);
	const chatPartialExecutionDestinationNode = ref<string | null>(null);
	const selectedTriggerNodeName = ref<string>();

	const {
		executingNode,
		lastAddedExecutingNode,
		addExecutingNode,
		removeExecutingNode,
		isNodeExecuting,
		clearNodeExecutionQueue,
	} = useExecutingNode();

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

			const parentNodes = workflowObject.value.getParentNodes(activeNode.name);

			for (const parentNode of parentNodes) {
				if (willNodeWait(workflowObject.value.nodes[parentNode])) {
					return true;
				}
			}

			return false;
		}
		return allNodes.value.some((node) => willNodeWait(node));
	});

	const isWorkflowRunning = computed(() => {
		if (activeExecutionId.value === null) {
			return true;
		} else if (activeExecutionId.value && workflowExecutionData.value) {
			if (
				['waiting', 'running'].includes(workflowExecutionData.value.status) &&
				!workflowExecutionData.value.finished
			) {
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

	const nodesIssuesExist = computed(() =>
		workflow.value.nodes.some((node) => {
			const nodeHasIssues = !!Object.keys(node.issues ?? {}).length;
			const isConnected =
				Object.keys(outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(incomingConnectionsByNodeName(node.name)).length > 0;
			return !node.disabled && isConnected && nodeHasIssues;
		}),
	);

	/**
	 * Get detailed validation issues for all connected, enabled nodes
	 */
	const workflowValidationIssues = computed(() => {
		const issues: Array<{
			node: string;
			type: string;
			value: string | string[];
		}> = [];

		const isStringOrStringArray = (value: unknown): value is string | string[] =>
			typeof value === 'string' || Array.isArray(value);

		workflow.value.nodes.forEach((node) => {
			if (!node.issues || node.disabled) return;

			const isConnected =
				Object.keys(outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(incomingConnectionsByNodeName(node.name)).length > 0;

			if (!isConnected) return;

			Object.entries(node.issues).forEach(([issueType, issueValue]) => {
				if (!issueValue) return;

				if (typeof issueValue === 'object' && !Array.isArray(issueValue)) {
					// Handle nested issues (parameters, credentials)
					Object.entries(issueValue).forEach(([_key, value]) => {
						if (value) {
							issues.push({
								node: node.name,
								type: issueType,
								value,
							});
						}
					});
				} else {
					// Handle direct issues
					issues.push({
						node: node.name,
						type: issueType,
						value: isStringOrStringArray(issueValue) ? issueValue : String(issueValue),
					});
				}
			});
		});

		return issues;
	});

	/**
	 * Format issue message for display
	 */
	function formatIssueMessage(issue: string | string[]): string {
		if (Array.isArray(issue)) {
			return issue.join(', ').replace(/\.$/, '');
		}
		return String(issue);
	}

	const pinnedWorkflowData = computed(() => workflow.value.pinData);

	const executedNode = computed(() => workflowExecutionData.value?.executedNode);

	const getAllLoadedFinishedExecutions = computed(() => {
		return currentWorkflowExecutions.value.filter(
			(ex) => ex.finished === true || ex.stoppedAt !== undefined,
		);
	});

	const getWorkflowExecution = computed(() => workflowExecutionData.value);

	const getPastChatMessages = computed(() => chatMessages.value);

	/**
	 * This section contains functions migrated from the workflow class
	 */

	const connectionsBySourceNode = computed(() => workflow.value.connections);
	const connectionsByDestinationNode = computed(() =>
		workflowUtils.mapConnectionsByDestination(workflow.value.connections),
	);

	// End section

	const selectableTriggerNodes = computed(() =>
		workflowTriggerNodes.value.filter((node) => !node.disabled && !isChatNode(node)),
	);

	const workflowExecutionTriggerNodeName = computed(() => {
		if (!isWorkflowRunning.value) {
			return undefined;
		}

		if (workflowExecutionData.value?.triggerNode) {
			return workflowExecutionData.value.triggerNode;
		}

		// In case of partial execution, triggerNode is not set, so I'm trying to find from runData
		return Object.keys(workflowExecutionData.value?.data?.resultData.runData ?? {}).find((name) =>
			workflowTriggerNodes.value.some((node) => node.name === name),
		);
	});

	/**
	 * Sets the active execution id
	 *
	 * @param {string} id used to indicate the id of the active execution
	 * @param {null} id used to indicate that an execution has started but its id has not been retrieved yet
	 * @param {undefined} id used to indicate there is no active execution
	 */
	const activeExecutionId = ref<string | null | undefined>();
	const previousExecutionId = ref<string | null | undefined>();
	const readonlyActiveExecutionId = computed(() => activeExecutionId.value);
	const readonlyPreviousExecutionId = computed(() => previousExecutionId.value);

	function setActiveExecutionId(id: string | null | undefined) {
		if (id) previousExecutionId.value = activeExecutionId.value;
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

	function isNodeInOutgoingNodeConnections(
		rootNodeName: string,
		searchNodeName: string,
		depth = -1,
	): boolean {
		if (depth === 0) return false;
		const firstNodeConnections = outgoingConnectionsByNodeName(rootNodeName);
		if (!firstNodeConnections?.main?.[0]) return false;

		const connections = firstNodeConnections.main[0];
		if (connections.some((node) => node.node === searchNodeName)) return true;

		return connections.some((node) =>
			isNodeInOutgoingNodeConnections(node.node, searchNodeName, depth - 1),
		);
	}

	function getWorkflowById(id: string): IWorkflowDb {
		return workflowsById.value[id];
	}

	function getNodeByName(nodeName: string): INodeUi | null {
		return workflowUtils.getNodeByName(nodesByName.value, nodeName);
	}

	function getNodeById(nodeId: string): INodeUi | undefined {
		return workflow.value.nodes.find((node) => node.id === nodeId);
	}

	// Finds the full id for a given partial id for a node, relying on order for uniqueness in edge cases
	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		return workflow.value.nodes.find((node) => node.id.startsWith(partialId));
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
				const nodeTypeDescription = nodeTypesStore.getNodeType(nodeType, version);

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

	function createWorkflowObject(
		nodes: INodeUi[],
		connections: IConnections,
		copyData?: boolean,
	): Workflow {
		const nodeTypes = getNodeTypes();

		let id: string | undefined = workflow.value.id;
		if (id && id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			id = undefined;
		}

		return new Workflow({
			id,
			name: workflow.value.name,
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings: workflow.value.settings ?? { ...defaults.settings },
			pinData: workflow.value.pinData,
		});
	}

	function cloneWorkflowObject(): Workflow {
		const nodes = getNodes();
		const connections = allConnections.value;

		return createWorkflowObject(nodes, connections);
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
		filters: {
			name?: string;
			tags?: string[];
			active?: boolean;
			isArchived?: boolean;
			parentFolderId?: string;
			availableInMCP?: boolean;
		} = {},
		includeFolders = false,
		onlySharedWithMe = false,
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
			onlySharedWithMe ? onlySharedWithMe : undefined,
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

	async function searchWorkflows({
		projectId,
		name,
	}: {
		projectId?: string;
		name?: string;
	}): Promise<IWorkflowDb[]> {
		const filter = {
			projectId,
			name,
		};

		const { data: workflows } = await workflowsApi.getWorkflows(
			rootStore.restApiContext,
			isEmpty(filter) ? undefined : filter,
		);
		return workflows;
	}

	async function fetchAllWorkflows(projectId?: string): Promise<IWorkflowDb[]> {
		const workflows = await searchWorkflows({ projectId });
		setWorkflows(workflows);
		return workflows;
	}

	async function fetchWorkflow(id: string): Promise<IWorkflowDb> {
		const workflowData = await workflowsApi.getWorkflow(rootStore.restApiContext, id);
		addWorkflow(workflowData);
		return workflowData;
	}

	async function fetchWorkflowsWithNodesIncluded(nodeTypes: string[]) {
		return await workflowsApi.getWorkflowsWithNodesIncluded(rootStore.restApiContext, nodeTypes);
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

	async function getNewWorkflowDataAndMakeShareable(
		name?: string,
		projectId?: string,
		parentFolderId?: string,
	): Promise<INewWorkflowData> {
		const workflowData = await getNewWorkflowData(name, projectId, parentFolderId);
		makeNewWorkflowShareable();
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

		setActiveExecutionId(undefined);
		executingNode.value.length = 0;
		executionWaitingForWebhook.value = false;
	}

	function setWorkflowId(id?: string) {
		workflow.value.id = !id || id === 'new' ? PLACEHOLDER_EMPTY_WORKFLOW_ID : id;
		workflowObject.value.id = workflow.value.id;
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
		workflowObject.value.name = data.newName;

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

	async function archiveWorkflow(id: string) {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/archive`,
		);
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = true;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}

		setWorkflowInactive(id);

		if (id === workflow.value.id) {
			setIsArchived(true);
			setWorkflowVersionId(updatedWorkflow.versionId);
		}
	}

	async function unarchiveWorkflow(id: string) {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/unarchive`,
		);
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = false;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}

		if (id === workflow.value.id) {
			setIsArchived(false);
			setWorkflowVersionId(updatedWorkflow.versionId);
		}
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
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index === -1) {
			activeWorkflows.value.push(targetWorkflowId);
		}
		if (workflowsById.value[targetWorkflowId]) {
			workflowsById.value[targetWorkflowId].active = true;
		}
		if (targetWorkflowId === workflow.value.id) {
			uiStore.stateIsDirty = false;
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

	function setIsArchived(isArchived: boolean) {
		workflow.value.isArchived = isArchived;
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
		workflowExecutionResultDataLastUpdate.value = Date.now();
		workflowExecutionStartedData.value = undefined;
	}

	function setWorkflowExecutionRunData(workflowResultData: IRunExecutionData) {
		if (workflowExecutionData.value) {
			workflowExecutionData.value = {
				...workflowExecutionData.value,
				data: workflowResultData,
			};
			workflowExecutionResultDataLastUpdate.value = Date.now();
			workflowExecutionStartedData.value = undefined;
		}
	}

	function setWorkflowSettings(workflowSettings: IWorkflowSettings) {
		workflow.value.settings = workflowSettings as IWorkflowDb['settings'];
		workflowObject.value.setSettings(workflowSettings);
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
		workflowObject.value.setPinData(validPinData);

		dataPinningEventBus.emit('pin-data', validPinData);
	}

	function setWorkflowTagIds(tags: string[]) {
		workflow.value.tags = tags;
	}

	function addWorkflowTagIds(tags: string[]) {
		workflow.value.tags = [
			...new Set([...(workflow.value.tags ?? []), ...tags]),
		] as IWorkflowDb['tags'];
	}

	function removeWorkflowTagId(tagId: string) {
		const tags = workflow.value.tags as string[];
		const updated = tags.filter((id: string) => id !== tagId);
		workflow.value.tags = updated as IWorkflowDb['tags'];
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
		workflowObject.value = createWorkflowObject(
			workflow.value.nodes,
			workflow.value.connections,
			true,
		);
	}

	function pinData(payload: {
		node: INodeUi;
		data: INodeExecutionData[];
		isRestoration?: boolean;
	}): void {
		const nodeName = payload.node.name;

		if (!workflow.value.pinData) {
			workflow.value.pinData = {};
		}

		if (!Array.isArray(payload.data)) {
			payload.data = [payload.data];
		}

		if (
			(workflow.value.pinData?.[nodeName] ?? []).length > 0 &&
			nodeMetadata.value[nodeName] &&
			!payload.isRestoration
		) {
			// Updating existing pinned data
			nodeMetadata.value[nodeName].pinnedDataLastUpdatedAt = Date.now();
		} else if (payload.isRestoration && nodeMetadata.value[nodeName]) {
			// Clear timestamps during restoration to prevent incorrect dirty marking
			delete nodeMetadata.value[nodeName].pinnedDataLastUpdatedAt;
			delete nodeMetadata.value[nodeName].pinnedDataLastRemovedAt;
		}

		const storedPinData = payload.data.map((item) =>
			isJsonKeyObject(item)
				? { json: item.json, ...(item.binary && { binary: item.binary }) }
				: { json: item },
		);

		workflow.value.pinData[nodeName] = storedPinData;
		workflowObject.value.setPinData(workflow.value.pinData);

		uiStore.stateIsDirty = true;

		dataPinningEventBus.emit('pin-data', { [payload.node.name]: storedPinData });
	}

	function unpinData(payload: { node: INodeUi }): void {
		const nodeName = payload.node.name;

		if (!workflow.value.pinData) {
			workflow.value.pinData = {};
		}

		const { [nodeName]: _, ...pinData } = workflow.value.pinData;
		workflow.value.pinData = pinData;
		workflowObject.value.setPinData(pinData);

		if (nodeMetadata.value[nodeName]) {
			nodeMetadata.value[nodeName].pinnedDataLastRemovedAt = Date.now();
		}

		uiStore.stateIsDirty = true;

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
			workflow.value.connections[sourceData.node] = {};
		}

		if (!workflow.value.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			workflow.value.connections[sourceData.node] = {
				...workflow.value.connections[sourceData.node],
				[sourceData.type]: [],
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

		workflowObject.value.setConnections(workflow.value.connections);
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
				connections.splice(Number.parseInt(index, 10), 1);
			}
		}

		workflowObject.value.setConnections(workflow.value.connections);
	}

	function removeAllConnections(data: { setStateDirty: boolean }): void {
		if (data?.setStateDirty) {
			uiStore.stateIsDirty = true;
		}

		workflow.value.connections = {};
		workflowObject.value.setConnections({});
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
						workflow.value.connections[sourceNode][type][Number.parseInt(sourceIndex, 10)];
					if (connectionsToRemove) {
						for (connectionIndex of Object.keys(connectionsToRemove)) {
							connectionData = connectionsToRemove[Number.parseInt(connectionIndex, 10)];
							if (connectionData.node === node.name) {
								indexesToRemove.push(connectionIndex);
							}
						}
						indexesToRemove.forEach((index) => {
							connectionsToRemove.splice(Number.parseInt(index, 10), 1);
						});
					}
				}
			}
		}

		workflowObject.value.setConnections(workflow.value.connections);
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		uiStore.stateIsDirty = true;

		// If node has any WorkflowResultData rename also that one that the data
		// does still get displayed also after node got renamed
		const runData = workflowExecutionData.value?.data?.resultData?.runData;
		if (runData?.[nameData.old]) {
			runData[nameData.new] = runData[nameData.old];
			delete runData[nameData.old];
		}

		// In case the renamed node was last selected set it also there with the new name
		if (uiStore.lastSelectedNode === nameData.old) {
			uiStore.lastSelectedNode = nameData.new;
		}

		const { [nameData.old]: removed, ...rest } = nodeMetadata.value;
		nodeMetadata.value = { ...rest, [nameData.new]: nodeMetadata.value[nameData.old] };

		if (workflow.value.pinData?.[nameData.old]) {
			const { [nameData.old]: renamed, ...restPinData } = workflow.value.pinData;
			workflow.value.pinData = {
				...restPinData,
				[nameData.new]: renamed,
			};

			workflowObject.value.setPinData(workflow.value.pinData);
		}

		const resultData = workflowExecutionData.value?.data?.resultData;
		if (resultData?.pinData?.[nameData.old]) {
			resultData.pinData[nameData.new] = resultData.pinData[nameData.old];
			delete resultData.pinData[nameData.old];
		}

		// Update the name in pinData
		Object.values(workflow.value.pinData ?? {})
			.concat(Object.values(workflowExecutionData.value?.data?.resultData.pinData ?? {}))
			.flatMap((executionData) =>
				executionData.flatMap((nodeExecution) =>
					Array.isArray(nodeExecution.pairedItem)
						? nodeExecution.pairedItem
						: [nodeExecution.pairedItem],
				),
			)
			.forEach((pairedItem) => {
				if (
					typeof pairedItem === 'number' ||
					pairedItem?.sourceOverwrite?.previousNode !== nameData.old
				)
					return;
				pairedItem.sourceOverwrite.previousNode = nameData.new;
			});

		Object.values(workflowExecutionData.value?.data?.resultData.runData ?? {})
			.flatMap((taskData) => taskData.flatMap((task) => task.source))
			.forEach((source) => {
				if (!source || source.previousNode !== nameData.old) return;
				source.previousNode = nameData.new;
			});
	}

	function setParentFolder(folder: IWorkflowDb['parentFolder']) {
		workflow.value.parentFolder = folder;
	}

	function setNodes(nodes: INodeUi[]): void {
		nodes.forEach((node) => {
			if (!node.id) {
				nodeHelpers.assignNodeId(node);
			}

			if (node.extendsCredential) {
				node.type = getCredentialOnlyNodeTypeName(node.extendsCredential);
			}

			if (node.position) {
				node.position = snapPositionToGrid(node.position);
			}

			if (!nodeMetadata.value[node.name]) {
				nodeMetadata.value[node.name] = { pristine: true };
			}
		});

		workflow.value.nodes = nodes;
		workflowObject.value.setNodes(nodes);
	}

	function setConnections(value: IConnections): void {
		workflow.value.connections = value;
		workflowObject.value.setConnections(value);
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
			const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
			const changed = !isEqual(existingData, nodeData);

			if (changed) {
				Object.assign(node, nodeData);
				workflow.value.nodes[nodeIndex] = node;
				workflowObject.value.setNodes(workflow.value.nodes);
			}

			return changed;
		}
		return false;
	}

	function setNodeIssue(nodeIssueData: INodeIssueData): void {
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === nodeIssueData.node;
		});
		if (nodeIndex === -1) {
			return;
		}

		const node = workflow.value.nodes[nodeIndex];

		if (nodeIssueData.value === null) {
			// Remove the value if one exists
			if (node.issues?.[nodeIssueData.type] === undefined) {
				// No values for type exist so nothing has to get removed
				return;
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
	}

	function addNode(nodeData: INodeUi): void {
		if (!nodeData.hasOwnProperty('name')) {
			// All nodes have to have a name
			// TODO: Check if there is an error or whatever that is supposed to be returned
			return;
		}

		workflow.value.nodes.push(nodeData);
		workflowObject.value.setNodes(workflow.value.nodes);

		// Init node metadata
		if (!nodeMetadata.value[nodeData.name]) {
			nodeMetadata.value[nodeData.name] = {} as INodeMetadata;
		}
	}

	function removeNode(node: INodeUi): void {
		const { [node.name]: removedNodeMetadata, ...remainingNodeMetadata } = nodeMetadata.value;
		nodeMetadata.value = remainingNodeMetadata;

		if (workflow.value.pinData?.hasOwnProperty(node.name)) {
			const { [node.name]: removedPinData, ...remainingPinData } = workflow.value.pinData;
			workflow.value.pinData = remainingPinData;
		}

		for (let i = 0; i < workflow.value.nodes.length; i++) {
			if (workflow.value.nodes[i].name === node.name) {
				workflow.value.nodes = [
					...workflow.value.nodes.slice(0, i),
					...workflow.value.nodes.slice(i + 1),
				];
				workflowObject.value.setNodes(workflow.value.nodes);
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
			workflow.value.pinData = {};
		}

		workflow.value.nodes.splice(0, workflow.value.nodes.length);
		workflowObject.value.setNodes(workflow.value.nodes);
		nodeMetadata.value = {};
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		// Find the node that should be updated
		const nodeIndex = workflow.value.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex !== -1) {
			for (const key of Object.keys(updateInformation.properties)) {
				const typedKey = key as keyof INodeUpdatePropertiesInformation['properties'];
				const property = updateInformation.properties[typedKey];

				const changed = updateNodeAtIndex(nodeIndex, { [key]: property });

				if (changed) {
					uiStore.stateIsDirty = true;
				}
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

		if (changed && !excludeKeys.includes(updateInformation.key)) {
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

		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...node.parameters, ...updateInformation.value }
				: updateInformation.value;

		const changed = updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			uiStore.stateIsDirty = true;
			nodeMetadata.value[node.name].parametersLastUpdatedAt = Date.now();
		}
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
			telemetry.track('Manual exec errored', {
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
			});
		}
	}

	function getFormResumeUrl(node: INode, executionId: string) {
		const { webhookSuffix } = (node.parameters.options ?? {}) as IDataObject;
		const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';
		const testUrl = `${rootStore.formWaitingUrl}/${executionId}${suffix}`;
		return testUrl;
	}

	function addNodeExecutionStartedData(data: NodeExecuteBefore['data']): void {
		const currentData =
			workflowExecutionStartedData.value?.[0] === data.executionId
				? workflowExecutionStartedData.value?.[1]
				: {};

		workflowExecutionStartedData.value = [
			data.executionId,
			{
				...currentData,
				[data.nodeName]: [...(currentData[data.nodeName] ?? []), data.data],
			},
		];
	}

	function updateNodeExecutionStatus(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		if (!workflowExecutionData.value?.data) {
			throw new Error('The "workflowExecutionData" is not initialized!');
		}

		const { nodeName, data, executionId } = pushData;
		const isNodeWaiting = data.executionStatus === 'waiting';
		const node = getNodeByName(nodeName);
		if (!node) return;

		workflowExecutionData.value.data.resultData.lastNodeExecuted = nodeName;

		if (workflowExecutionData.value.data.resultData.runData[nodeName] === undefined) {
			workflowExecutionData.value.data.resultData.runData[nodeName] = [];
		}

		const tasksData = workflowExecutionData.value.data.resultData.runData[nodeName];
		if (isNodeWaiting) {
			tasksData.push(data);
			workflowExecutionResultDataLastUpdate.value = Date.now();

			if (
				node.type === FORM_NODE_TYPE ||
				(node.type === WAIT_NODE_TYPE && node.parameters.resume === 'form')
			) {
				const testUrl = getFormResumeUrl(node, executionId);
				openFormPopupWindow(testUrl);
			}
		} else {
			// If we process items in parallel on subnodes we get several placeholder taskData items.
			// We need to find and replace the item with the matching executionIndex and only append if we don't find anything matching.
			const existingRunIndex = tasksData.findIndex(
				(item) => item.executionIndex === data.executionIndex,
			);

			// For waiting nodes always replace the last item as executionIndex will always be different
			const hasWaitingItems = tasksData.some((it) => it.executionStatus === 'waiting');
			const index =
				existingRunIndex > -1 && !hasWaitingItems ? existingRunIndex : tasksData.length - 1;
			const status = tasksData[index]?.executionStatus ?? 'unknown';

			if ('waiting' === status || 'running' === status || tasksData[existingRunIndex]) {
				tasksData.splice(index, 1, data);
			} else {
				tasksData.push(data);
			}

			workflowExecutionResultDataLastUpdate.value = Date.now();

			void trackNodeExecution(pushData);
		}
	}

	function updateNodeExecutionRunData(pushData: PushPayload<'nodeExecuteAfterData'>): void {
		const tasksData = workflowExecutionData.value?.data?.resultData.runData[pushData.nodeName];
		const existingRunIndex =
			tasksData?.findIndex((item) => item.executionIndex === pushData.data.executionIndex) ?? -1;

		if (tasksData?.[existingRunIndex]) {
			tasksData.splice(existingRunIndex, 1, pushData.data);
			workflowExecutionResultDataLastUpdate.value = Date.now();
		}
	}

	function clearNodeExecutionData(nodeName: string): void {
		if (!workflowExecutionData.value?.data) {
			return;
		}

		const { [nodeName]: removedRunData, ...remainingRunData } =
			workflowExecutionData.value.data.resultData.runData;
		workflowExecutionData.value.data.resultData.runData = remainingRunData;
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
	async function createNewWorkflow(sendData: WorkflowDataCreate): Promise<IWorkflowDb> {
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

	// Update a single workflow setting key while preserving existing settings
	async function updateWorkflowSetting<K extends keyof IWorkflowSettings>(
		id: string,
		key: K,
		value: IWorkflowSettings[K],
	): Promise<IWorkflowDb> {
		// Determine current settings and versionId for the target workflow
		let currentSettings: IWorkflowSettings = {} as IWorkflowSettings;
		let currentVersionId = '';
		const isCurrentWorkflow = id === workflow.value.id;

		if (isCurrentWorkflow) {
			currentSettings = workflow.value.settings ?? ({} as IWorkflowSettings);
			currentVersionId = workflow.value.versionId;
		} else {
			const cached = workflowsById.value[id];
			if (cached && cached.versionId) {
				currentSettings = cached.settings ?? ({} as IWorkflowSettings);
				currentVersionId = cached.versionId;
			} else {
				const fetched = await fetchWorkflow(id);
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
		});

		// Update local store state to reflect the change
		if (isCurrentWorkflow) {
			setWorkflowVersionId(updated.versionId);
			setWorkflowSettings(updated.settings ?? {});
		} else if (workflowsById.value[id]) {
			workflowsById.value[id] = {
				...workflowsById.value[id],
				settings: updated.settings,
				versionId: updated.versionId,
			};
		}

		return updated;
	}

	async function runWorkflow(startRunData: IStartRunData): Promise<IExecutionPushResponse> {
		if (startRunData.workflowData.settings === null) {
			startRunData.workflowData.settings = undefined;
		}

		try {
			return await makeRestApiRequest(
				rootStore.restApiContext,
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
		const parents = workflowObject.value.getParentNodes(nodeName, NodeConnectionTypes.Main);

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

	function markExecutionAsStopped(stopData?: IExecutionsStopData) {
		setActiveExecutionId(undefined);
		clearNodeExecutionQueue();
		executionWaitingForWebhook.value = false;
		workflowHelpers.setDocumentTitle(workflowName.value, 'IDLE');
		workflowExecutionStartedData.value = undefined;

		clearPopupWindowState();

		if (!workflowExecutionData.value) {
			return;
		}

		const runData = workflowExecutionData.value.data?.resultData.runData ?? {};

		for (const nodeName in runData) {
			runData[nodeName] = runData[nodeName].filter(
				({ executionStatus }) => executionStatus === 'success',
			);
		}

		if (stopData) {
			workflowExecutionData.value.status = stopData.status;
			workflowExecutionData.value.startedAt = stopData.startedAt;
			workflowExecutionData.value.stoppedAt = stopData.stoppedAt;
		}
	}

	function setSelectedTriggerNodeName(value: string) {
		selectedTriggerNodeName.value = value;
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
		usedCredentials,
		activeWorkflows,
		currentWorkflowExecutions,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		workflowExecutionResultDataLastUpdate,
		workflowExecutionStartedData,
		activeExecutionId: readonlyActiveExecutionId,
		previousExecutionId: readonlyPreviousExecutionId,
		setActiveExecutionId,
		subWorkflowExecutionError,
		executionWaitingForWebhook,
		executingNode,
		lastAddedExecutingNode,
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
		connectionsBySourceNode,
		connectionsByDestinationNode,
		isWaitingExecution,
		isWorkflowRunning,
		canvasNames,
		nodesByName,
		nodesIssuesExist,
		workflowValidationIssues,
		formatIssueMessage,
		pinnedWorkflowData,
		executedNode,
		getAllLoadedFinishedExecutions,
		getWorkflowExecution,
		getPastChatMessages,
		selectedTriggerNodeName: computed(() => selectedTriggerNodeName.value),
		workflowExecutionTriggerNodeName,
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
		workflowObject,
		createWorkflowObject,
		cloneWorkflowObject,
		getWorkflowFromUrl,
		getActivationError,
		searchWorkflows,
		fetchAllWorkflows,
		fetchWorkflowsPage,
		fetchWorkflow,
		fetchWorkflowsWithNodesIncluded,
		getNewWorkflowData,
		makeNewWorkflowShareable,
		resetWorkflow,
		resetState,
		addNodeExecutionStartedData,
		addExecutingNode,
		removeExecutingNode,
		setWorkflowId,
		setUsedCredentials,
		setWorkflowName,
		setWorkflowVersionId,
		replaceInvalidWorkflowCredentials,
		setWorkflows,
		deleteWorkflow,
		archiveWorkflow,
		unarchiveWorkflow,
		addWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		fetchActiveWorkflows,
		setActive,
		setIsArchived,
		getDuplicateCurrentWorkflowName,
		setWorkflowExecutionData,
		setWorkflowExecutionRunData,
		setWorkflowSettings,
		setWorkflowPinData,
		setWorkflowTagIds,
		setParentFolder,
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
		updateNodeExecutionRunData,
		updateNodeExecutionStatus,
		clearNodeExecutionData,
		pinDataByNodeName,
		activeNode,
		getPastExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		updateWorkflowSetting,
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
		findNodeByPartialId,
		getPartialIdForNode,
		getNewWorkflowDataAndMakeShareable,
		setSelectedTriggerNodeName,
		totalWorkflowCount,
	};
});
