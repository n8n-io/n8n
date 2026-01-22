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
	DocumentKey,
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

const createEmptyWorkflow = (): IWorkflowDb => ({
	id: '',
	...defaults,
});

/**
 * Creates a document key from a workflow ID and optional version.
 * @param id The workflow ID
 * @param version The version (defaults to 'latest')
 * @returns A DocumentKey in the format `{id}@{version}`
 */
export function createDocumentKey(id: string, version: string = 'latest'): DocumentKey {
	return `${id}@${version}` as DocumentKey;
}

/**
 * Parses a document key into its component parts.
 * @param key The document key to parse
 * @returns An object with id and version properties
 */
export function parseDocumentKey(key: DocumentKey): { id: string; version: string } {
	const atIndex = key.lastIndexOf('@');
	if (atIndex === -1) {
		return { id: key, version: 'latest' };
	}
	return {
		id: key.slice(0, atIndex),
		version: key.slice(atIndex + 1),
	};
}

/**
 * Checks if a document key represents the latest version.
 * @param key The document key to check
 * @returns True if the key represents the latest version
 */
export function isLatestVersion(key: DocumentKey): boolean {
	return key.endsWith('@latest');
}

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
	const lastSuccessfulExecution = ref<IExecutionResponse | null>(null);
	const workflowExecutionStartedData =
		ref<[executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]>();
	const workflowExecutionResultDataLastUpdate = ref<number>();
	const workflowExecutionPairedItemMappings = ref<Record<string, Set<string>>>({});
	const executionWaitingForWebhook = ref(false);
	const workflowsById = ref<Record<string, IWorkflowDb>>({});
	const nodeMetadata = ref<NodeMetadataMap>({});

	// Document-based storage for multi-workflow support
	// Key format: `{workflowId}@{version}` where version is 'latest' or a specific version ID
	const documentWorkflowsById = ref<Record<DocumentKey, IWorkflowDb>>({});
	const documentWorkflowObjectsById = ref<Record<DocumentKey, Workflow>>({});
	const documentNodeMetadataById = ref<Record<DocumentKey, NodeMetadataMap>>({});
	// Tracks which documents are new (not yet saved to the backend)
	// This is set via ?new=true query param in NodeView and cleared on save
	const isNewDocumentById = ref<Record<DocumentKey, boolean>>({});

	const isInDebugMode = ref(false);
	const chatMessages = ref<string[]>([]);
	const chatPartialExecutionDestinationNode = ref<string | null>(null);
	const selectedTriggerNodeName = ref<string>();

	const workflowName = computed(() => workflow.value.name);

	const workflowId = computed(() => workflow.value.id);

	const workflowVersionId = computed(() => workflow.value.versionId);

	const workflowChecksum = ref<string>('');

	const workflowSettings = computed(() => workflow.value.settings ?? { ...defaults.settings });

	const workflowTags = computed(() => workflow.value.tags as string[]);

	const allWorkflows = computed(() =>
		Object.values(workflowsById.value).sort((a, b) => a.name.localeCompare(b.name)),
	);

	// A workflow is new if it hasn't been saved to the backend yet
	const isNewWorkflow = computed(() => {
		if (!workflow.value.id) return true;

		// Check if the workflow exists in workflowsById
		const existingWorkflow = workflowsById.value[workflow.value.id];
		// If workflow doesn't exist in the store or has no ID, it's new
		return !existingWorkflow?.id;
	});

	// A workflow is new if it hasn't been saved to the backend yet
	const isWorkflowSaved = computed(() => {
		return Object.keys(workflowsById.value).reduce<Record<string, boolean>>((acc, workflowId) => {
			acc[workflowId] = true;
			return acc;
		}, {});
	});

	const isWorkflowActive = computed(() => workflow.value.activeVersionId !== null);

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

	const nodesWithIssues = computed(() =>
		workflow.value.nodes.filter((node) => {
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

	function findRootWithMainConnection(nodeName: string): string | null {
		const children = workflowObject.value.getChildNodes(nodeName, 'ALL');

		for (let i = children.length - 1; i >= 0; i--) {
			const childName = children[i];
			const parentNodes = workflowObject.value.getParentNodes(childName, NodeConnectionTypes.Main);

			if (parentNodes.length > 0) {
				return childName;
			}
		}

		return null;
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
		return workflow.value.nodes.map((node) => ({ ...node }));
	}

	////
	// Document management functions for multi-workflow support
	////

	/**
	 * Gets a workflow document by its document key.
	 * @param key The document key (format: `{workflowId}@{version}`)
	 * @returns The workflow document or undefined if not found
	 */
	function getDocumentWorkflow(key: DocumentKey): IWorkflowDb | undefined {
		return documentWorkflowsById.value[key];
	}

	/**
	 * Gets a workflow object (Workflow instance) by its document key.
	 * @param key The document key
	 * @returns The workflow object or undefined if not found
	 */
	function getDocumentWorkflowObject(key: DocumentKey): Workflow | undefined {
		return documentWorkflowObjectsById.value[key];
	}

	/**
	 * Gets node metadata by its document key.
	 * @param key The document key
	 * @returns The node metadata map or undefined if not found
	 */
	function getDocumentNodeMetadata(key: DocumentKey): NodeMetadataMap | undefined {
		return documentNodeMetadataById.value[key];
	}

	/**
	 * Checks if a document exists in the store.
	 * @param key The document key
	 * @returns True if the document exists
	 */
	function hasDocument(key: DocumentKey): boolean {
		return key in documentWorkflowsById.value;
	}

	/**
	 * Sets a workflow document in the store and creates the corresponding workflow object.
	 * @param key The document key
	 * @param workflowData The workflow data to set
	 */
	function setDocument(key: DocumentKey, workflowData: IWorkflowDb): void {
		documentWorkflowsById.value[key] = workflowData;

		// Create the corresponding workflow object
		const nodeTypes = getNodeTypes();
		documentWorkflowObjectsById.value[key] = new Workflow({
			id: workflowData.id || undefined,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
			settings: workflowData.settings ?? { ...defaults.settings },
			pinData: workflowData.pinData,
		});

		// Initialize empty node metadata if not present
		if (!documentNodeMetadataById.value[key]) {
			documentNodeMetadataById.value[key] = {};
		}
	}

	/**
	 * Removes a document from all maps.
	 * @param key The document key to remove
	 */
	function removeDocument(key: DocumentKey): void {
		delete documentWorkflowsById.value[key];
		delete documentWorkflowObjectsById.value[key];
		delete documentNodeMetadataById.value[key];
		delete isNewDocumentById.value[key];
	}

	////
	// Document-aware property accessors
	// These functions provide access to document properties by DocumentKey
	////

	function getDocumentWorkflowName(key: DocumentKey): string {
		return documentWorkflowsById.value[key]?.name ?? '';
	}

	function getDocumentWorkflowId(key: DocumentKey): string {
		return documentWorkflowsById.value[key]?.id ?? '';
	}

	function getDocumentWorkflowVersionId(key: DocumentKey): string {
		return documentWorkflowsById.value[key]?.versionId ?? '';
	}

	function getDocumentWorkflowSettings(key: DocumentKey): IWorkflowSettings {
		return documentWorkflowsById.value[key]?.settings ?? { ...defaults.settings };
	}

	function getDocumentWorkflowTags(key: DocumentKey): string[] {
		return (documentWorkflowsById.value[key]?.tags as string[]) ?? [];
	}

	function isDocumentNewWorkflow(key: DocumentKey): boolean {
		return isNewDocumentById.value[key] === true;
	}

	/**
	 * Marks a document as new (not yet saved to the backend).
	 * Call this when creating a new workflow via ?new=true query param.
	 */
	function setDocumentIsNew(key: DocumentKey, isNew: boolean): void {
		if (isNew) {
			isNewDocumentById.value[key] = true;
		} else {
			delete isNewDocumentById.value[key];
		}
	}

	function isDocumentWorkflowActive(key: DocumentKey): boolean {
		return documentWorkflowsById.value[key]?.activeVersionId !== null;
	}

	function getDocumentWorkflowTriggerNodes(key: DocumentKey): INodeUi[] {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return [];
		return doc.nodes.filter((node: INodeUi) => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType && nodeType.group.includes('trigger');
		});
	}

	function documentHasWebhookNode(key: DocumentKey): boolean {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return false;
		return !!doc.nodes.find((node: INodeUi) => !!node.webhookId);
	}

	function getDocumentAllConnections(key: DocumentKey): IConnections {
		return documentWorkflowsById.value[key]?.connections ?? {};
	}

	function getDocumentAllNodes(key: DocumentKey): INodeUi[] {
		return documentWorkflowsById.value[key]?.nodes ?? [];
	}

	function getDocumentCanvasNames(key: DocumentKey): Set<string> {
		const nodes = getDocumentAllNodes(key);
		return new Set(nodes.map((n) => n.name));
	}

	function getDocumentNodesByName(key: DocumentKey): Record<string, INodeUi> {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return {};
		return doc.nodes.reduce<Record<string, INodeUi>>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {});
	}

	function getDocumentPinnedWorkflowData(key: DocumentKey): IPinData | undefined {
		return documentWorkflowsById.value[key]?.pinData;
	}

	////
	// Document-aware node/connection access functions
	////

	function getDocumentNodeByName(key: DocumentKey, nodeName: string): INodeUi | null {
		const nodesByName = getDocumentNodesByName(key);
		return workflowUtils.getNodeByName(nodesByName, nodeName);
	}

	function getDocumentNodeById(key: DocumentKey, nodeId: string): INodeUi | undefined {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return undefined;
		return doc.nodes.find((node) => node.id === nodeId);
	}

	function getDocumentNodesByIds(key: DocumentKey, nodeIds: string[]): INodeUi[] {
		return nodeIds.map((id) => getDocumentNodeById(key, id)).filter(isPresent);
	}

	function getDocumentOutgoingConnectionsByNodeName(
		key: DocumentKey,
		nodeName: string,
	): INodeConnections {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return {};
		if (doc.connections.hasOwnProperty(nodeName)) {
			return doc.connections[nodeName] as unknown as INodeConnections;
		}
		return {};
	}

	function getDocumentIncomingConnectionsByNodeName(
		key: DocumentKey,
		nodeName: string,
	): INodeConnections {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return {};
		const connectionsByDest = workflowUtils.mapConnectionsByDestination(doc.connections);
		if (connectionsByDest.hasOwnProperty(nodeName)) {
			return connectionsByDest[nodeName] as unknown as INodeConnections;
		}
		return {};
	}

	function documentNodeHasOutputConnection(key: DocumentKey, nodeName: string): boolean {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return false;
		return doc.connections.hasOwnProperty(nodeName);
	}

	function isDocumentNodeInOutgoingNodeConnections(
		key: DocumentKey,
		rootNodeName: string,
		searchNodeName: string,
		depth = -1,
	): boolean {
		if (depth === 0) return false;
		const firstNodeConnections = getDocumentOutgoingConnectionsByNodeName(key, rootNodeName);
		if (!firstNodeConnections?.main?.[0]) return false;

		const connections = firstNodeConnections.main[0];
		if (connections.some((node) => node.node === searchNodeName)) return true;

		return connections.some((node) =>
			isDocumentNodeInOutgoingNodeConnections(key, node.node, searchNodeName, depth - 1),
		);
	}

	function findDocumentNodeByPartialId(key: DocumentKey, partialId: string): INodeUi | undefined {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return undefined;
		return doc.nodes.find((node) => node.id.startsWith(partialId));
	}

	function getDocumentPartialIdForNode(key: DocumentKey, fullId: string): string {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return fullId;
		for (let length = 6; length < fullId.length; ++length) {
			const partialId = fullId.slice(0, length);
			if (doc.nodes.filter((x) => x.id.startsWith(partialId)).length === 1) {
				return partialId;
			}
		}
		return fullId;
	}

	function findDocumentRootWithMainConnection(key: DocumentKey, nodeName: string): string | null {
		const workflowObj = documentWorkflowObjectsById.value[key];
		if (!workflowObj) return null;

		const children = workflowObj.getChildNodes(nodeName, 'ALL');

		for (let i = children.length - 1; i >= 0; i--) {
			const childName = children[i];
			const parentNodes = workflowObj.getParentNodes(childName, NodeConnectionTypes.Main);

			if (parentNodes.length > 0) {
				return childName;
			}
		}

		return null;
	}

	function getDocumentNodes(key: DocumentKey): INodeUi[] {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return [];
		return doc.nodes.map((node) => ({ ...node }));
	}

	function createDocumentWorkflowObject(
		key: DocumentKey,
		nodes: INodeUi[],
		connections: IConnections,
		copyData?: boolean,
	): Workflow {
		const nodeTypes = getNodeTypes();
		const doc = documentWorkflowsById.value[key];

		return new Workflow({
			id: doc?.id || undefined,
			name: doc?.name ?? '',
			nodes: copyData ? deepCopy(nodes) : nodes,
			connections: copyData ? deepCopy(connections) : connections,
			active: false,
			nodeTypes,
			settings: doc?.settings ?? { ...defaults.settings },
			pinData: doc?.pinData,
		});
	}

	function cloneDocumentWorkflowObject(key: DocumentKey): Workflow {
		const nodes = getDocumentNodes(key);
		const connections = getDocumentAllConnections(key);
		return createDocumentWorkflowObject(key, nodes, connections);
	}

	////
	// Document-aware mutation functions
	////

	function resetDocumentWorkflow(key: DocumentKey): void {
		const emptyWorkflow = createEmptyWorkflow();
		setDocument(key, emptyWorkflow);
	}

	function setDocumentNodes(key: DocumentKey, nodes: INodeUi[]): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;
		doc.nodes = nodes;
		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setNodes(nodes);
		}
	}

	function setDocumentConnections(key: DocumentKey, connections: IConnections): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;
		doc.connections = connections;
		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setConnections(connections);
		}
	}

	function addDocumentNode(key: DocumentKey, nodeData: INodeUi): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		if (!nodeData.hasOwnProperty('name')) {
			return;
		}

		// Initialize nodes array if needed
		if (!Array.isArray(doc.nodes)) {
			doc.nodes = [];
		}

		doc.nodes.push(nodeData);

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setNodes(doc.nodes);
		}

		// Initialize node metadata
		const metadata = documentNodeMetadataById.value[key];
		if (metadata && !metadata[nodeData.name]) {
			metadata[nodeData.name] = {} as INodeMetadata;
		}
	}

	function removeDocumentNode(key: DocumentKey, node: INodeUi): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		// Remove node metadata
		const metadata = documentNodeMetadataById.value[key];
		if (metadata && node.name in metadata) {
			delete metadata[node.name];
		}

		// Remove from pinData
		if (doc.pinData?.hasOwnProperty(node.name)) {
			const { [node.name]: _removedPinData, ...remainingPinData } = doc.pinData;
			doc.pinData = remainingPinData;
		}

		for (let i = 0; i < doc.nodes.length; i++) {
			if (doc.nodes[i].name === node.name) {
				doc.nodes = [...doc.nodes.slice(0, i), ...doc.nodes.slice(i + 1)];
				const workflowObj = documentWorkflowObjectsById.value[key];
				if (workflowObj) {
					workflowObj.setNodes(doc.nodes);
				}
				return;
			}
		}
	}

	function addDocumentConnection(key: DocumentKey, data: { connection: IConnection[] }): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		if (data.connection.length !== 2) {
			return;
		}

		const sourceData: IConnection = data.connection[0];
		const destinationData: IConnection = data.connection[1];

		if (!doc.connections.hasOwnProperty(sourceData.node)) {
			doc.connections[sourceData.node] = {};
		}

		if (!doc.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
			doc.connections[sourceData.node] = {
				...doc.connections[sourceData.node],
				[sourceData.type]: [],
			};
		}

		if (doc.connections[sourceData.node][sourceData.type].length < sourceData.index + 1) {
			for (
				let i = doc.connections[sourceData.node][sourceData.type].length;
				i <= sourceData.index;
				i++
			) {
				doc.connections[sourceData.node][sourceData.type].push([]);
			}
		}

		// Check if the same connection exists already
		const checkProperties = ['index', 'node', 'type'] as Array<keyof IConnection>;
		let propertyName: keyof IConnection;
		let connectionExists = false;

		const nodeConnections = doc.connections[sourceData.node][sourceData.type];
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

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setConnections(doc.connections);
		}
	}

	function removeDocumentConnection(key: DocumentKey, data: { connection: IConnection[] }): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		const sourceData = data.connection[0];
		const destinationData = data.connection[1];

		if (!doc.connections.hasOwnProperty(sourceData.node)) return;
		if (!doc.connections[sourceData.node].hasOwnProperty(sourceData.type)) return;
		if (doc.connections[sourceData.node][sourceData.type].length < sourceData.index + 1) return;

		const connections = doc.connections[sourceData.node][sourceData.type][sourceData.index];
		if (!connections) return;

		doc.connections[sourceData.node][sourceData.type][sourceData.index] = connections.filter(
			(conn) =>
				!(
					conn.node === destinationData.node &&
					conn.type === destinationData.type &&
					conn.index === destinationData.index
				),
		);

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setConnections(doc.connections);
		}
	}

	function removeAllDocumentNodeConnection(
		key: DocumentKey,
		node: INodeUi,
		options: { preserveInputConnections?: boolean; preserveOutputConnections?: boolean } = {},
	): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		// Remove output connections
		if (!options.preserveOutputConnections && doc.connections.hasOwnProperty(node.name)) {
			delete doc.connections[node.name];
		}

		// Remove input connections
		if (!options.preserveInputConnections) {
			for (const sourceNode in doc.connections) {
				for (const type in doc.connections[sourceNode]) {
					for (let index = 0; index < doc.connections[sourceNode][type].length; index++) {
						const connections = doc.connections[sourceNode][type][index];
						if (connections) {
							doc.connections[sourceNode][type][index] = connections.filter(
								(conn) => conn.node !== node.name,
							);
						}
					}
				}
			}
		}

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setConnections(doc.connections);
		}
	}

	function pinDocumentData(
		key: DocumentKey,
		payload: { node: INodeUi; data: INodeExecutionData[] },
	): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		const nodeName = payload.node.name;

		if (!doc.pinData) {
			doc.pinData = {};
		}

		// Store pin data with proper structure
		const storedPinData = payload.data.map((item) => {
			if (!isJsonKeyObject(item)) {
				return { json: item };
			}
			return item;
		});

		doc.pinData[nodeName] = storedPinData;

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setPinData(doc.pinData);
		}

		// Update node metadata
		const metadata = documentNodeMetadataById.value[key];
		if (metadata) {
			if (!metadata[nodeName]) {
				metadata[nodeName] = {} as INodeMetadata;
			}
			metadata[nodeName].pinnedDataLastUpdatedAt = Date.now();
		}

		dataPinningEventBus.emit('pin-data', { [nodeName]: storedPinData });
	}

	function unpinDocumentData(key: DocumentKey, payload: { node: INodeUi }): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc || !doc.pinData) return;

		const nodeName = payload.node.name;

		const { [nodeName]: _, ...pinData } = doc.pinData;
		doc.pinData = pinData;

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setPinData(pinData);
		}

		// Update node metadata
		const metadata = documentNodeMetadataById.value[key];
		if (metadata && metadata[nodeName]) {
			metadata[nodeName].pinnedDataLastRemovedAt = Date.now();
		}

		dataPinningEventBus.emit('unpin-data', { nodeNames: [nodeName] });
	}

	function setDocumentWorkflowPinData(key: DocumentKey, data: IPinData = {}): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		// Ensure all pin data items have the proper { json: ... } structure
		const validPinData = Object.keys(data).reduce((accu, nodeName) => {
			accu[nodeName] = data[nodeName].map((item) => {
				if (!isJsonKeyObject(item)) {
					return { json: item };
				}
				return item;
			});
			return accu;
		}, {} as IPinData);

		doc.pinData = validPinData;

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setPinData(validPinData);
		}
	}

	function setDocumentWorkflowSettings(key: DocumentKey, settings: IWorkflowSettings): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		doc.settings = settings as IWorkflowDb['settings'];

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.setSettings(settings);
		}
	}

	function setDocumentWorkflowName(key: DocumentKey, name: string): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		doc.name = name;

		const workflowObj = documentWorkflowObjectsById.value[key];
		if (workflowObj) {
			workflowObj.name = name;
		}

		// Update in workflowsById if present
		const { id } = parseDocumentKey(key);
		if (id && workflowsById.value[id]) {
			workflowsById.value[id].name = name;
		}
	}

	function setDocumentWorkflowVersionId(
		key: DocumentKey,
		versionId: string,
		checksum?: string,
	): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		doc.versionId = versionId;
		if (checksum) {
			doc.checksum = checksum;
		}
	}

	function setDocumentUsedCredentials(key: DocumentKey, data: IUsedCredential[]): void {
		const doc = documentWorkflowsById.value[key];
		if (!doc) return;

		doc.usedCredentials = data;
	}

	function setDocumentNodePristine(key: DocumentKey, nodeName: string, isPristine: boolean): void {
		const metadata = documentNodeMetadataById.value[key];
		if (!metadata) return;

		if (!metadata[nodeName]) {
			metadata[nodeName] = { pristine: isPristine };
		} else {
			metadata[nodeName].pristine = isPristine;
		}

		if (!isPristine) {
			metadata[nodeName].parametersLastUpdatedAt = Date.now();
		}
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
		// If workflow doesn't exist in store, treat as new (no ID)
		if (id && !workflowsById.value[id]?.id) {
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

	async function getWorkflowFromUrl(url: string, projectId: string): Promise<IWorkflowDb> {
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/workflows/from-url', {
			url,
			projectId,
		});
	}

	async function fetchLastSuccessfulExecution() {
		const workflowPermissions = getResourcePermissions(workflow.value.scopes).workflow;

		try {
			if (
				isNewWorkflow.value ||
				sourceControlStore.preferences.branchReadOnly ||
				uiStore.isReadOnlyView ||
				!workflowPermissions.update ||
				workflow.value.isArchived
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
		workflow.value = createEmptyWorkflow();
		workflowChecksum.value = '';
	}

	function setUsedCredentials(data: IUsedCredential[]) {
		workflow.value.usedCredentials = data;
		usedCredentials.value = data.reduce<{ [name: string]: IUsedCredential }>((accu, credential) => {
			accu[credential.id] = credential;
			return accu;
		}, {});
	}

	function setWorkflowVersionId(versionId: string, newChecksum?: string) {
		workflow.value.versionId = versionId;
		if (newChecksum) {
			workflowChecksum.value = newChecksum;
		}
	}

	function setWorkflowActiveVersion(version: WorkflowHistory | null) {
		workflow.value.activeVersion = deepCopy(version);
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
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to archive workflow');
		}
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = true;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}

		setWorkflowInactive(id);

		if (id === workflow.value.id) {
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
		if (workflowsById.value[id]) {
			workflowsById.value[id].isArchived = false;
			workflowsById.value[id].versionId = updatedWorkflow.versionId;
		}
		if (id === workflow.value.id) {
			setIsArchived(false);
			setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
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

	function setWorkflowActive(
		targetWorkflowId: string,
		activeVersion: WorkflowHistory,
		clearDirtyState: boolean,
	) {
		if (activeWorkflows.value.indexOf(targetWorkflowId) === -1) {
			activeWorkflows.value.push(targetWorkflowId);
		}

		const cachedWorkflow = workflowsById.value[targetWorkflowId];
		if (cachedWorkflow) {
			cachedWorkflow.active = true;
			cachedWorkflow.activeVersionId = activeVersion.versionId;
			cachedWorkflow.activeVersion = activeVersion;
		}

		if (targetWorkflowId === workflow.value.id) {
			if (clearDirtyState) {
				uiStore.markStateClean();
			}
			workflow.value.active = true;
			workflow.value.activeVersionId = activeVersion.versionId;
			workflow.value.activeVersion = activeVersion;
		}
	}

	function setWorkflowInactive(targetWorkflowId: string) {
		const index = activeWorkflows.value.indexOf(targetWorkflowId);
		if (index !== -1) {
			activeWorkflows.value.splice(index, 1);
		}
		const targetWorkflow = workflowsById.value[targetWorkflowId];
		if (targetWorkflow) {
			targetWorkflow.active = false;
			targetWorkflow.activeVersionId = null;
			targetWorkflow.activeVersion = null;
		}
		if (targetWorkflowId === workflow.value.id) {
			workflow.value.active = false;
			workflow.value.activeVersionId = null;
			workflow.value.activeVersion = null;
		}
	}

	async function fetchActiveWorkflows(): Promise<string[]> {
		const data = await workflowsApi.getActiveWorkflows(rootStore.restApiContext);
		activeWorkflows.value = data;
		return data;
	}

	function setIsArchived(isArchived: boolean) {
		workflow.value.isArchived = isArchived;
	}

	function setDescription(description: string | undefined | null) {
		workflow.value.description = description;
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

	function setWorkflow(value: IWorkflowDb): void {
		const tags = convertWorkflowTagsToIds(value.tags);
		workflow.value = {
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

		workflow.value.pinData[nodeName] = storedPinData;
		workflowObject.value.setPinData(workflow.value.pinData);

		uiStore.markStateDirty();

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

		uiStore.markStateDirty();

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

	function removeAllNodeConnection(
		node: INodeUi,
		{ preserveInputConnections = false, preserveOutputConnections = false } = {},
	): void {
		uiStore.markStateDirty();

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

	function addNode(nodeData: INodeUi): void {
		// @TODO(ckolb): Reminder to refactor useActions:setAddedNodeActionParameters
		// which listens to this function being called, when this is moved to workflowState soon

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

		if (id === workflow.value.id) {
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
		const isCurrentWorkflow = id === workflow.value.id;

		if (isCurrentWorkflow) {
			currentSettings = workflow.value.settings ?? ({} as IWorkflowSettings);
			currentVersionId = workflow.value.versionId;
			currentChecksum = workflowChecksum.value;
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
			...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
		});

		// Update local store state to reflect the change
		if (isCurrentWorkflow) {
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

	async function saveWorkflowDescription(
		id: string,
		description: string | null,
	): Promise<IWorkflowDb> {
		let currentVersionId = '';
		let currentChecksum = '';
		const isCurrentWorkflow = id === workflow.value.id;

		if (isCurrentWorkflow) {
			currentVersionId = workflow.value.versionId;
			currentChecksum = workflowChecksum.value;
		} else {
			const cached = workflowsById.value[id];
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

		if (workflowsById.value[id]) {
			workflowsById.value[id] = {
				...workflowsById.value[id],
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
		executionWaitingForWebhook,
		workflowsById,
		nodeMetadata,
		// Document-based storage for multi-workflow support
		documentWorkflowsById,
		documentWorkflowObjectsById,
		documentNodeMetadataById,
		isNewDocumentById,
		// Document management functions
		getDocumentWorkflow,
		getDocumentWorkflowObject,
		getDocumentNodeMetadata,
		hasDocument,
		setDocument,
		removeDocument,
		setDocumentIsNew,
		// Document-aware property accessors
		getDocumentWorkflowName,
		getDocumentWorkflowId,
		getDocumentWorkflowVersionId,
		getDocumentWorkflowSettings,
		getDocumentWorkflowTags,
		isDocumentNewWorkflow,
		isDocumentWorkflowActive,
		getDocumentWorkflowTriggerNodes,
		documentHasWebhookNode,
		getDocumentAllConnections,
		getDocumentAllNodes,
		getDocumentCanvasNames,
		getDocumentNodesByName,
		getDocumentPinnedWorkflowData,
		// Document-aware node/connection access functions
		getDocumentNodeByName,
		getDocumentNodeById,
		getDocumentNodesByIds,
		getDocumentOutgoingConnectionsByNodeName,
		getDocumentIncomingConnectionsByNodeName,
		documentNodeHasOutputConnection,
		isDocumentNodeInOutgoingNodeConnections,
		findDocumentNodeByPartialId,
		getDocumentPartialIdForNode,
		findDocumentRootWithMainConnection,
		getDocumentNodes,
		createDocumentWorkflowObject,
		cloneDocumentWorkflowObject,
		// Document-aware mutation functions
		resetDocumentWorkflow,
		setDocumentNodes,
		setDocumentConnections,
		addDocumentNode,
		removeDocumentNode,
		addDocumentConnection,
		removeDocumentConnection,
		removeAllDocumentNodeConnection,
		pinDocumentData,
		unpinDocumentData,
		setDocumentWorkflowPinData,
		setDocumentWorkflowSettings,
		setDocumentWorkflowName,
		setDocumentWorkflowVersionId,
		setDocumentUsedCredentials,
		setDocumentNodePristine,
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
