import {
	AI_NODES_PACKAGE_NAME,
	CHAT_TRIGGER_NODE_TYPE,
	DEFAULT_WORKFLOW_PAGE_SIZE,
	DUPLICATE_POSTFFIX,
	ERROR_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import { STORES } from '@n8n/stores';
import type {
	INodeMetadata,
	INodeUi,
	IStartRunData,
	IWorkflowDb,
	IWorkflowsMap,
	NodeMetadataMap,
	WorkflowListResource,
	WorkflowValidationIssue,
} from '@/Interface';
import type {
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionFlattedResponse,
} from '@/features/execution/executions/executions.types';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataCreate, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
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
	SEND_AND_WAIT_OPERATION,
	Workflow,
	TelemetryHelpers,
	BINARY_MODE_SEPARATE,
} from 'n8n-workflow';
import * as workflowUtils from 'n8n-workflow/common';

import { useRootStore } from '@n8n/stores/useRootStore';
import * as workflowsApi from '@/app/api/workflows';
import { useUIStore } from '@/app/stores/ui.store';
import { dataPinningEventBus } from '@/app/event-bus';
import { isJsonKeyObject, stringSizeInBytes, isPresent } from '@/app/utils/typesUtils';
import { makeRestApiRequest, ResponseError, type WorkflowHistory } from '@n8n/rest-api-client';
import {
	unflattenExecutionData,
	findTriggerNodeToAutoSelect,
	openFormPopupWindow,
} from '@/features/execution/executions/executions.utils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getCredentialOnlyNodeTypeName } from '@/app/utils/credentialOnlyNodes';
import { convertWorkflowTagsToIds } from '@/app/utils/workflowUtils';
import { i18n } from '@n8n/i18n';

import { computed, ref, watch } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useSettingsStore } from './settings.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useUsersStore } from '@/features/settings/users/users.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { isChatNode } from '@/app/utils/aiUtils';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { hasRole } from '@/app/utils/rbac/checks';

const defaults: Omit<IWorkflowDb, 'id'> & { settings: NonNullable<IWorkflowDb['settings']> } = {
	name: '',
	description: '',
	active: false,
	activeVersionId: null,
	isArchived: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {},
	nodes: [],
	settings: {
		executionOrder: 'v1',
		binaryMode: BINARY_MODE_SEPARATE,
	},
	tags: [],
	pinData: {},
	versionId: '',
	usedCredentials: [],
};

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

	// Multi-workflow state: stores workflow documents and Workflow class instances by ID
	const workflowDocumentById = ref<Record<string, IWorkflowDb>>({});
	const workflowObjectById = ref<Record<string, Workflow>>({});

	// For paginated workflow lists
	const totalWorkflowCount = ref(0);
	const usedCredentials = ref<Record<string, IUsedCredential>>({});

	const activeWorkflows = ref<string[]>([]);
	const currentWorkflowExecutions = ref<ExecutionSummary[]>([]);
	const workflowExecutionData = ref<IExecutionResponse | null>(null);
	const lastSuccessfulExecution = ref<IExecutionResponse | null>(null);
	const workflowExecutionStartedData =
		ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
	const workflowExecutionResultDataLastUpdate = ref<number>();
	const workflowExecutionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const executionWaitingForWebhook = ref(false);
	const nodeMetadata = ref<NodeMetadataMap>({});
	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);
	const chatPartialExecutionDestinationNode = ref<string | null>(null);
	const selectedTriggerNodeName = ref<string>();

	const workflowId = ref('');

	const workflowName = computed(() => workflowDocumentById.value[workflowId.value]?.name ?? '');

	const workflowVersionId = computed(() => workflowDocumentById.value[workflowId.value]?.versionId);

	const workflowChecksum = ref<string>('');

	const workflowSettings = computed(
		() => workflowDocumentById.value[workflowId.value]?.settings ?? { ...defaults.settings },
	);

	const workflowTags = computed(
		() => (workflowDocumentById.value[workflowId.value]?.tags ?? []) as string[],
	);

	const allWorkflows = computed(() =>
		Object.values(workflowDocumentById.value).sort((a, b) => a.name.localeCompare(b.name)),
	);

	// A workflow is new if it hasn't been saved to the backend yet
	const isNewWorkflow = computed(() => {
		const id = workflowId.value;
		if (!id) return true;

		// Check if the workflow exists in workflowDocumentById with a valid ID
		const existingWorkflow = workflowDocumentById.value[id];
		return !existingWorkflow?.id;
	});

	// Returns a map of workflow IDs to whether they are saved
	const isWorkflowSaved = computed(() => {
		return Object.keys(workflowDocumentById.value).reduce<Record<string, boolean>>((acc, wfId) => {
			acc[wfId] = true;
			return acc;
		}, {});
	});

	const isWorkflowActive = computed(
		() => workflowDocumentById.value[workflowId.value]?.activeVersionId !== null,
	);

	const workflowTriggerNodes = computed(() =>
		(workflowDocumentById.value[workflowId.value]?.nodes ?? []).filter((node: INodeUi) => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType && nodeType.group.includes('trigger');
		}),
	);

	const currentWorkflowHasWebhookNode = computed(
		() =>
			!!(workflowDocumentById.value[workflowId.value]?.nodes ?? []).find(
				(node: INodeUi) => !!node.webhookId,
			),
	);

	const getWorkflowRunData = computed<IRunData | null>(() => {
		if (!workflowExecutionData.value?.data?.resultData) {
			return null;
		}

		return workflowExecutionData.value.data.resultData.runData;
	});

	const allConnections = computed(
		() => workflowDocumentById.value[workflowId.value]?.connections ?? {},
	);

	const allNodes = computed<INodeUi[]>(
		() => workflowDocumentById.value[workflowId.value]?.nodes ?? [],
	);

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
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];

		if (activeNode) {
			if (willNodeWait(activeNode)) return true;

			if (currentWorkflowObject) {
				const parentNodes = currentWorkflowObject.getParentNodes(activeNode.name);

				for (const parentNode of parentNodes) {
					if (willNodeWait(currentWorkflowObject.nodes[parentNode])) {
						return true;
					}
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
		return (workflowDocumentById.value[workflowId.value]?.nodes ?? []).reduce<
			Record<string, INodeUi>
		>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {});
	});

	const nodesWithIssues = computed(() =>
		(workflowDocumentById.value[workflowId.value]?.nodes ?? []).filter((node) => {
			const nodeHasIssues = Object.keys(node.issues ?? {}).length > 0;
			const isConnected =
				Object.keys(outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(incomingConnectionsByNodeName(node.name)).length > 0;
			return !node.disabled && isConnected && nodeHasIssues;
		}),
	);

	const nodesWithIssuesCount = computed(() => nodesWithIssues.value.length);

	const nodesIssuesExist = computed(() => nodesWithIssuesCount.value > 0);

	/**
	 * Get detailed validation issues for all connected, enabled nodes
	 */
	const workflowValidationIssues = computed(() => {
		const issues: WorkflowValidationIssue[] = [];

		const isStringOrStringArray = (value: unknown): value is string | string[] =>
			typeof value === 'string' || Array.isArray(value);

		(workflowDocumentById.value[workflowId.value]?.nodes ?? []).forEach((node) => {
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

	const pinnedWorkflowData = computed(() => workflowDocumentById.value[workflowId.value]?.pinData);

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

	const connectionsBySourceNode = computed(
		() => workflowDocumentById.value[workflowId.value]?.connections ?? {},
	);
	const connectionsByDestinationNode = computed(() =>
		workflowUtils.mapConnectionsByDestination(
			workflowDocumentById.value[workflowId.value]?.connections ?? {},
		),
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
		const connections = workflowDocumentById.value[workflowId.value]?.connections ?? {};
		if (connections.hasOwnProperty(nodeName)) {
			return connections[nodeName] as unknown as INodeConnections;
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
		const connections = workflowDocumentById.value[workflowId.value]?.connections ?? {};
		return connections.hasOwnProperty(nodeName);
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
		return workflowDocumentById.value[id];
	}

	function getNodeByName(nodeName: string): INodeUi | null {
		return workflowUtils.getNodeByName(nodesByName.value, nodeName);
	}

	function getNodeById(nodeId: string): INodeUi | undefined {
		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		return nodes.find((node) => node.id === nodeId);
	}

	function findRootWithMainConnection(nodeName: string): string | null {
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (!currentWorkflowObject) return null;

		const children = currentWorkflowObject.getChildNodes(nodeName, 'ALL');

		for (let i = children.length - 1; i >= 0; i--) {
			const childName = children[i];
			const parentNodes = currentWorkflowObject.getParentNodes(childName, NodeConnectionTypes.Main);

			if (parentNodes.length > 0) {
				return childName;
			}
		}

		return null;
	}

	// Finds the full id for a given partial id for a node, relying on order for uniqueness in edge cases
	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		return nodes.find((node) => node.id.startsWith(partialId));
	}

	// Finds a uniquely identifying partial id for a node, relying on order for uniqueness in edge cases
	function getPartialIdForNode(fullId: string): string {
		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		for (let length = 6; length < fullId.length; ++length) {
			const partialId = fullId.slice(0, length);
			if (nodes.filter((x) => x.id.startsWith(partialId)).length === 1) {
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
						(![ERROR_TRIGGER_NODE_TYPE].includes(nodeType) &&
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
		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		return nodes.map((node) => ({ ...node }));
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
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		let id: string | undefined = currentWorkflowDocument?.id;
		// If workflow doesn't exist in store, treat as new (no ID)
		if (id && !workflowDocumentById.value[id]?.id) {
			id = undefined;
		}

		return new Workflow({
			id,
			name: currentWorkflowDocument?.name ?? '',
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings: currentWorkflowDocument?.settings ?? { ...defaults.settings },
			pinData: currentWorkflowDocument?.pinData,
		});
	}

	function cloneWorkflowObject(): Workflow {
		const nodes = getNodes();
		const connections = allConnections.value;

		return createWorkflowObject(nodes, connections);
	}

	async function getWorkflowFromUrl(url: string, projectId: string): Promise<IWorkflowDb> {
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/workflows/from-url', {
			url,
			projectId,
		});
	}

	async function fetchLastSuccessfulExecution() {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		const workflowPermissions = getResourcePermissions(currentWorkflowDocument?.scopes).workflow;

		try {
			if (
				isNewWorkflow.value ||
				sourceControlStore.preferences.branchReadOnly ||
				uiStore.isReadOnlyView ||
				!workflowPermissions.update ||
				currentWorkflowDocument?.isArchived
			) {
				return;
			}

			lastSuccessfulExecution.value = await workflowsApi.getLastSuccessfulExecution(
				rootStore.restApiContext,
				workflowId.value,
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

	async function fetchWorkflowsPage(
		projectId?: string,
		page = 1,
		pageSize = DEFAULT_WORKFLOW_PAGE_SIZE,
		sortBy?: string,
		filters: {
			query?: string;
			tags?: string[];
			active?: boolean;
			isArchived?: boolean;
			parentFolderId?: string;
			availableInMCP?: boolean;
			triggerNodeTypes?: string[];
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
		query,
		nodeTypes,
		tags,
		select,
		isArchived,
		triggerNodeTypes,
	}: {
		projectId?: string;
		query?: string;
		nodeTypes?: string[];
		tags?: string[];
		select?: string[];
		isArchived?: boolean;
		triggerNodeTypes?: string[];
	}): Promise<IWorkflowDb[]> {
		const filter = {
			projectId,
			query,
			nodeTypes,
			tags,
			isArchived,
			triggerNodeTypes,
		};

		// Check if filter has meaningful values (not just undefined, null, or empty arrays/strings)
		const hasFilter = Object.values(filter).some(
			(v) => isPresent(v) && (Array.isArray(v) ? v.length > 0 : v !== ''),
		);

		const { data: workflows } = await workflowsApi.getWorkflows(
			rootStore.restApiContext,
			hasFilter ? filter : undefined,
			undefined,
			select,
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

	async function checkWorkflowExists(id: string): Promise<boolean> {
		const result = await workflowsApi.workflowExists(rootStore.restApiContext, id);
		return result.exists;
	}

	function resetWorkflow() {
		const id = workflowId.value;
		if (id) {
			delete workflowDocumentById.value[id];
			delete workflowObjectById.value[id];
		}
		workflowId.value = '';
		workflowChecksum.value = '';
	}

	function setUsedCredentials(data: IUsedCredential[]) {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.usedCredentials = data;
		}
		usedCredentials.value = data.reduce<{ [name: string]: IUsedCredential }>((accu, credential) => {
			accu[credential.id] = credential;
			return accu;
		}, {});
	}

	function setWorkflowVersionId(versionId: string, newChecksum?: string) {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.versionId = versionId;
		}
		if (newChecksum) {
			workflowChecksum.value = newChecksum;
		}
	}

	function setWorkflowActiveVersion(version: WorkflowHistory | null) {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.activeVersion = deepCopy(version);
		}
	}

	// replace invalid credentials in workflow
	function replaceInvalidWorkflowCredentials(data: {
		credentials: INodeCredentialsDetails;
		invalid: INodeCredentialsDetails;
		type: string;
	}) {
		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		nodes.forEach((node: INodeUi) => {
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

		const nodes = workflowDocumentById.value[workflowId.value]?.nodes ?? [];
		nodes.forEach((node: INodeUi) => {
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
			const supportsCredential = nodeType.credentials.some((cred) => cred.name === data.type);
			if (!supportsCredential) {
				return;
			}

			// Assign the same credential to the node
			node.credentials ??= {} satisfies INodeCredentials;
			node.credentials[data.type] = data.credentials;

			updatedNodesCount++;
		});

		return updatedNodesCount;
	}

	function setWorkflows(workflows: IWorkflowDb[]) {
		workflowDocumentById.value = workflows.reduce<IWorkflowsMap>((acc, wf: IWorkflowDb) => {
			if (wf.id) {
				acc[wf.id] = wf;
			}
			return acc;
		}, {});
	}

	async function deleteWorkflow(id: string) {
		await makeRestApiRequest(rootStore.restApiContext, 'DELETE', `/workflows/${id}`);
		const { [id]: deletedWorkflow, ...workflows } = workflowDocumentById.value;
		workflowDocumentById.value = workflows;
	}

	async function archiveWorkflow(id: string) {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/archive`,
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to archive workflow');
		}
		if (workflowDocumentById.value[id]) {
			workflowDocumentById.value[id].isArchived = true;
			workflowDocumentById.value[id].versionId = updatedWorkflow.versionId;
		}

		setWorkflowInactive(id);

		if (id === workflowId.value) {
			setIsArchived(true);
			setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
		}
	}

	async function unarchiveWorkflow(id: string) {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/unarchive`,
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to unarchive workflow');
		}
		if (workflowDocumentById.value[id]) {
			workflowDocumentById.value[id].isArchived = false;
			workflowDocumentById.value[id].versionId = updatedWorkflow.versionId;
		}
		if (id === workflowId.value) {
			setIsArchived(false);
			setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
		}
	}

	function addWorkflow(wf: IWorkflowDb) {
		workflowDocumentById.value = {
			...workflowDocumentById.value,
			[wf.id]: {
				...workflowDocumentById.value[wf.id],
				...deepCopy(wf),
			},
		};
	}

	function setWorkflowActive(
		targetWorkflowId: string,
		activeVersion: WorkflowHistory,
		clearDirtyState: boolean,
	) {
		if (activeWorkflows.value.indexOf(targetWorkflowId) === -1) {
			activeWorkflows.value.push(targetWorkflowId);
		}

		const cachedWorkflow = workflowDocumentById.value[targetWorkflowId];
		if (cachedWorkflow) {
			cachedWorkflow.active = true;
			cachedWorkflow.activeVersionId = activeVersion.versionId;
			cachedWorkflow.activeVersion = activeVersion;
		}

		if (targetWorkflowId === workflowId.value) {
			if (clearDirtyState) {
				uiStore.markStateClean();
			}
			// Already updated via cachedWorkflow above since workflowDocumentById is unified
		}
	}

	function setWorkflowInactive(targetWorkflowId: string) {
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index !== -1) {
			activeWorkflows.value.splice(index, 1);
		}
		const targetWorkflow = workflowDocumentById.value[targetWorkflowId];
		if (targetWorkflow) {
			targetWorkflow.active = false;
			targetWorkflow.activeVersionId = null;
			targetWorkflow.activeVersion = null;
		}
		// Already updated via targetWorkflow above since workflowDocumentById is unified
	}

	async function fetchActiveWorkflows(): Promise<string[]> {
		const data = await workflowsApi.getActiveWorkflows(rootStore.restApiContext);
		activeWorkflows.value = data;
		return data;
	}

	function setIsArchived(isArchived: boolean) {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.isArchived = isArchived;
		}
	}

	function setDescription(description: string | undefined | null) {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.description = description;
		}
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
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.settings = workflowSettings as IWorkflowDb['settings'];
		}
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setSettings(workflowSettings);
		}
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

		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.pinData = validPinData;
		}
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setPinData(validPinData);
		}

		dataPinningEventBus.emit('pin-data', validPinData);
	}

	function setWorkflow(value: IWorkflowDb): void {
		const tags = convertWorkflowTagsToIds(value.tags);
		const normalizedWorkflow: IWorkflowDb = {
			...value,
			...(tags.length > 0 ? { tags } : {}),
			...(!value.hasOwnProperty('active') ? { active: false } : {}),
			...(!value.hasOwnProperty('connections') ? { connections: {} } : {}),
			...(!value.hasOwnProperty('createdAt') ? { createdAt: -1 } : {}),
			...(!value.hasOwnProperty('updatedAt') ? { updatedAt: -1 } : {}),
			...(!value.hasOwnProperty('id') ? { id: '' } : {}),
			...(!value.hasOwnProperty('nodes') ? { nodes: [] } : {}),
			...(!value.hasOwnProperty('settings') ? { settings: { ...defaults.settings } } : {}),
		};

		const id = normalizedWorkflow.id || '';
		workflowId.value = id;
		workflowDocumentById.value[id] = normalizedWorkflow;
		workflowObjectById.value[id] = createWorkflowObject(
			normalizedWorkflow.nodes,
			normalizedWorkflow.connections,
			true,
		);
	}

	function pinData(payload: {
		node: INodeUi;
		data: INodeExecutionData[];
		isRestoration?: boolean;
	}): void {
		const nodeName = payload.node.name;
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		if (!currentWorkflowDocument) return;

		if (!currentWorkflowDocument.pinData) {
			currentWorkflowDocument.pinData = {};
		}

		if (!Array.isArray(payload.data)) {
			payload.data = [payload.data];
		}

		if (
			(currentWorkflowDocument.pinData?.[nodeName] ?? []).length > 0 &&
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

		const storedPinData = payload.data.map((item) => {
			// Store only essential properties: json, binary, and pairedItem
			// Exclude runtime properties (error, metadata, evaluationData, etc.)
			if (isJsonKeyObject(item)) {
				const { json, binary, pairedItem } = item;
				return {
					json,
					...(binary && { binary }),
					...(pairedItem !== undefined && { pairedItem }),
				};
			}
			return { json: item };
		});

		currentWorkflowDocument.pinData[nodeName] = storedPinData;
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setPinData(currentWorkflowDocument.pinData);
		}

		uiStore.markStateDirty();

		dataPinningEventBus.emit('pin-data', { [payload.node.name]: storedPinData });
	}

	function unpinData(payload: { node: INodeUi }): void {
		const nodeName = payload.node.name;
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		if (!currentWorkflowDocument) return;

		if (!currentWorkflowDocument.pinData) {
			currentWorkflowDocument.pinData = {};
		}

		const { [nodeName]: _, ...pinData } = currentWorkflowDocument.pinData;
		currentWorkflowDocument.pinData = pinData;
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setPinData(pinData);
		}

		if (nodeMetadata.value[nodeName]) {
			nodeMetadata.value[nodeName].pinnedDataLastRemovedAt = Date.now();
		}

		uiStore.markStateDirty();

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

		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

		const sourceData: IConnection = data.connection[0];
		const destinationData: IConnection = data.connection[1];

		// Check if source node and type exist already and if not add them
		if (!currentWorkflowDocument.connections.hasOwnProperty(sourceData.node)) {
			currentWorkflowDocument.connections[sourceData.node] = {};
		}

		if (!currentWorkflowDocument.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			currentWorkflowDocument.connections[sourceData.node] = {
				...currentWorkflowDocument.connections[sourceData.node],
				[sourceData.type]: [],
			};
		}

		if (
			currentWorkflowDocument.connections[sourceData.node][sourceData.type].length <
			sourceData.index + 1
		) {
			for (
				let i = currentWorkflowDocument.connections[sourceData.node][sourceData.type].length;
				i <= sourceData.index;
				i++
			) {
				currentWorkflowDocument.connections[sourceData.node][sourceData.type].push([]);
			}
		}

		// Check if the same connection exists already
		const checkProperties = ['index', 'node', 'type'] as Array<keyof IConnection>;
		let propertyName: keyof IConnection;
		let connectionExists = false;

		const nodeConnections = currentWorkflowDocument.connections[sourceData.node][sourceData.type];
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

		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setConnections(currentWorkflowDocument.connections);
		}
	}

	function removeConnection(data: { connection: IConnection[] }): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

		const sourceData = data.connection[0];
		const destinationData = data.connection[1];

		if (!currentWorkflowDocument.connections.hasOwnProperty(sourceData.node)) {
			return;
		}

		if (!currentWorkflowDocument.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			return;
		}

		if (
			currentWorkflowDocument.connections[sourceData.node][sourceData.type].length <
			sourceData.index + 1
		) {
			return;
		}

		uiStore.markStateDirty();

		const connections =
			currentWorkflowDocument.connections[sourceData.node][sourceData.type][sourceData.index];
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

		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setConnections(currentWorkflowDocument.connections);
		}
	}

	function removeAllNodeConnection(
		node: INodeUi,
		{ preserveInputConnections = false, preserveOutputConnections = false } = {},
	): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

		uiStore.markStateDirty();

		// Remove all source connections
		if (!preserveOutputConnections) {
			delete currentWorkflowDocument.connections[node.name];
		}

		// Remove all destination connections
		if (preserveInputConnections) {
			const currentWorkflowObject = workflowObjectById.value[workflowId.value];
			if (currentWorkflowObject) {
				currentWorkflowObject.setConnections(currentWorkflowDocument.connections);
			}
			return;
		}

		const indexesToRemove = [];
		let sourceNode: string,
			type: string,
			sourceIndex: string,
			connectionIndex: string,
			connectionData: IConnection;

		for (sourceNode of Object.keys(currentWorkflowDocument.connections)) {
			for (type of Object.keys(currentWorkflowDocument.connections[sourceNode])) {
				for (sourceIndex of Object.keys(currentWorkflowDocument.connections[sourceNode][type])) {
					indexesToRemove.length = 0;
					const connectionsToRemove =
						currentWorkflowDocument.connections[sourceNode][type][Number.parseInt(sourceIndex, 10)];
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

		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setConnections(currentWorkflowDocument.connections);
		}
	}

	function renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		uiStore.markStateDirty();

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

		if (currentWorkflowDocument?.pinData?.[nameData.old]) {
			const { [nameData.old]: renamed, ...restPinData } = currentWorkflowDocument.pinData;
			currentWorkflowDocument.pinData = {
				...restPinData,
				[nameData.new]: renamed,
			};

			const currentWorkflowObject = workflowObjectById.value[workflowId.value];
			if (currentWorkflowObject) {
				currentWorkflowObject.setPinData(currentWorkflowDocument.pinData);
			}
		}

		const resultData = workflowExecutionData.value?.data?.resultData;
		if (resultData?.pinData?.[nameData.old]) {
			resultData.pinData[nameData.new] = resultData.pinData[nameData.old];
			delete resultData.pinData[nameData.old];
		}

		// Update the name in pinData
		Object.values(currentWorkflowDocument?.pinData ?? {})
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
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.parentFolder = folder;
		}
	}

	function setNodes(nodes: INodeUi[]): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

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

		currentWorkflowDocument.nodes = nodes;
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setNodes(nodes);
		}
	}

	function setConnections(value: IConnections): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (currentWorkflowDocument) {
			currentWorkflowDocument.connections = value;
		}
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setConnections(value);
		}
	}

	function addNode(nodeData: INodeUi): void {
		// @TODO(ckolb): Reminder to refactor useActions:setAddedNodeActionParameters
		// which listens to this function being called, when this is moved to workflowState soon

		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

		if (!nodeData.hasOwnProperty('name')) {
			// All nodes have to have a name
			// TODO: Check if there is an error or whatever that is supposed to be returned
			return;
		}

		currentWorkflowDocument.nodes.push(nodeData);
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (currentWorkflowObject) {
			currentWorkflowObject.setNodes(currentWorkflowDocument.nodes);
		}

		// Init node metadata
		if (!nodeMetadata.value[nodeData.name]) {
			nodeMetadata.value[nodeData.name] = {} as INodeMetadata;
		}
	}

	function removeNode(node: INodeUi): void {
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument) return;

		const { [node.name]: removedNodeMetadata, ...remainingNodeMetadata } = nodeMetadata.value;
		nodeMetadata.value = remainingNodeMetadata;

		if (currentWorkflowDocument.pinData?.hasOwnProperty(node.name)) {
			const { [node.name]: removedPinData, ...remainingPinData } = currentWorkflowDocument.pinData;
			currentWorkflowDocument.pinData = remainingPinData;
		}

		for (let i = 0; i < currentWorkflowDocument.nodes.length; i++) {
			if (currentWorkflowDocument.nodes[i].name === node.name) {
				currentWorkflowDocument.nodes = [
					...currentWorkflowDocument.nodes.slice(0, i),
					...currentWorkflowDocument.nodes.slice(i + 1),
				];
				const currentWorkflowObject = workflowObjectById.value[workflowId.value];
				if (currentWorkflowObject) {
					currentWorkflowObject.setNodes(currentWorkflowDocument.nodes);
				}
				uiStore.markStateDirty();
				return;
			}
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
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];
		if (!currentWorkflowDocument?.pinData?.[nodeName]) return undefined;

		return currentWorkflowDocument.pinData[nodeName].map(
			(item) => item.json,
		) as INodeExecutionData[];
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

		if (id === workflowId.value) {
			setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
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

	async function deactivateWorkflow(id: string): Promise<IWorkflowDb> {
		const updatedWorkflow = await makeRestApiRequest<IWorkflowDb>(
			rootStore.restApiContext,
			'POST',
			`/workflows/${id}/deactivate`,
		);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to deactivate workflow');
		}

		setWorkflowInactive(id);

		if (id === workflowId.value) {
			setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
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
		const isCurrentWorkflow = id === workflowId.value;
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		if (isCurrentWorkflow && currentWorkflowDocument) {
			currentSettings = currentWorkflowDocument.settings ?? ({} as IWorkflowSettings);
			currentVersionId = currentWorkflowDocument.versionId;
			currentChecksum = workflowChecksum.value;
		} else {
			const cached = workflowDocumentById.value[id];
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
			...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
		});

		// Update local store state to reflect the change
		if (isCurrentWorkflow) {
			setWorkflowSettings(updated.settings ?? {});
		} else if (workflowDocumentById.value[id]) {
			workflowDocumentById.value[id] = {
				...workflowDocumentById.value[id],
				settings: updated.settings,
				versionId: updated.versionId,
			};
		}

		return updated;
	}

	async function saveWorkflowDescription(
		id: string,
		description: string | null,
	): Promise<IWorkflowDb> {
		let currentVersionId = '';
		let currentChecksum = '';
		const isCurrentWorkflow = id === workflowId.value;
		const currentWorkflowDocument = workflowDocumentById.value[workflowId.value];

		if (isCurrentWorkflow && currentWorkflowDocument) {
			currentVersionId = currentWorkflowDocument.versionId;
			currentChecksum = workflowChecksum.value;
		} else {
			const cached = workflowDocumentById.value[id];
			if (cached?.versionId) {
				currentVersionId = cached.versionId;
			} else {
				const fetched = await fetchWorkflow(id);
				currentVersionId = fetched.versionId;
			}
		}

		const updated = await updateWorkflow(id, {
			versionId: currentVersionId,
			description,
			expectedChecksum: currentChecksum,
		});

		if (workflowDocumentById.value[id]) {
			workflowDocumentById.value[id] = {
				...workflowDocumentById.value[id],
				description: updated.description,
				versionId: updated.versionId,
			};
		}

		// Update local store state
		if (isCurrentWorkflow) {
			setDescription(updated.description ?? '');
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
		const currentWorkflowObject = workflowObjectById.value[workflowId.value];
		if (!currentWorkflowObject) return false;

		const parents = currentWorkflowObject.getParentNodes(nodeName, NodeConnectionTypes.Main);

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

	function setSelectedTriggerNodeName(value: string) {
		selectedTriggerNodeName.value = value;
	}

	/**
	 * Get the webhook URL for a node
	 * @param nodeId - The ID of the node
	 * @param webhookType - The type of webhook ('test' or 'production')
	 * @returns The webhook URL or undefined if the node doesn't have webhooks
	 */
	function getWebhookUrl(nodeId: string, webhookType: 'test' | 'production'): string | undefined {
		const node = getNodeById(nodeId);
		if (!node) return;

		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType?.webhooks?.length) return;

		const webhook = nodeType.webhooks[0];
		return workflowHelpers.getWebhookUrl(webhook, node, webhookType);
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
		workflowDocumentById,
		workflowObjectById,
		usedCredentials,
		activeWorkflows,
		currentWorkflowExecutions,
		workflowExecutionData,
		workflowExecutionPairedItemMappings,
		workflowExecutionResultDataLastUpdate,
		workflowExecutionStartedData,
		activeExecutionId: readonlyActiveExecutionId,
		previousExecutionId: readonlyPreviousExecutionId,
		executionWaitingForWebhook,
		nodeMetadata,
		isInDebugMode,
		chatMessages,
		chatPartialExecutionDestinationNode,
		workflowName,
		workflowId,
		workflowVersionId,
		workflowChecksum,
		workflowSettings,
		workflowTags,
		allWorkflows,
		isNewWorkflow,
		isWorkflowSaved,
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
		nodesWithIssuesCount,
		nodesWithIssues,
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
		findRootWithMainConnection,
		getNodeById,
		getNodesByIds,
		getParametersLastUpdate,
		getPinnedDataLastUpdate,
		getPinnedDataLastRemovedAt,
		isNodePristine,
		getExecutionDataById,
		getPinDataSize,
		getNodeTypes,
		getNodes,
		convertTemplateNodeToNodeUi,
		createWorkflowObject,
		cloneWorkflowObject,
		getWorkflowFromUrl,
		getActivationError,
		searchWorkflows,
		fetchAllWorkflows,
		fetchWorkflowsPage,
		fetchWorkflow,
		fetchWorkflowsWithNodesIncluded,
		checkWorkflowExists,
		resetWorkflow,
		addNodeExecutionStartedData,
		setUsedCredentials,
		setWorkflowVersionId,
		setWorkflowActiveVersion,
		replaceInvalidWorkflowCredentials,
		assignCredentialToMatchingNodes,
		setWorkflows,
		deleteWorkflow,
		archiveWorkflow,
		unarchiveWorkflow,
		addWorkflow,
		setWorkflowActive,
		setWorkflowInactive,
		fetchActiveWorkflows,
		setIsArchived,
		setDescription,
		getDuplicateCurrentWorkflowName,
		setWorkflowExecutionRunData,
		setWorkflowPinData,
		setParentFolder,
		setWorkflow,
		pinData,
		unpinData,
		addConnection,
		removeConnection,
		removeAllNodeConnection,
		renameNodeSelectedAndExecution,
		addNode,
		removeNode,
		updateNodeExecutionRunData,
		updateNodeExecutionStatus,
		clearNodeExecutionData,
		pinDataByNodeName,
		activeNode,
		getPastExecutions,
		getExecution,
		createNewWorkflow,
		updateWorkflow,
		publishWorkflow,
		deactivateWorkflow,
		updateWorkflowSetting,
		saveWorkflowDescription,
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
		removeNodeById,
		removeNodeConnectionsById,
		removeNodeExecutionDataById,
		setNodes,
		setConnections,
		findNodeByPartialId,
		getPartialIdForNode,
		setSelectedTriggerNodeName,
		totalWorkflowCount,
		fetchLastSuccessfulExecution,
		lastSuccessfulExecution,
		getWebhookUrl,
		canViewWorkflows,
		defaults,
		// This is exposed to ease the refactoring to the injected workflowState composable
		// Please do not use outside this context
		private: {
			setWorkflowSettings,
			setActiveExecutionId,
		},
	};
});
