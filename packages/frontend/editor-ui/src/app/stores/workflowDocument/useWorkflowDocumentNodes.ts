import {
	computed,
	effectScope,
	ref,
	shallowReactive,
	shallowRef,
	type ComputedRef,
	type Ref,
} from 'vue';
import { createEventHook } from '@vueuse/core';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import type {
	INode,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeIssueData,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeTypeDescription,
	Workflow,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	XYPosition,
} from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { mapLegacyEndpointsToCanvasConnectionPort } from '@/features/workflows/canvas/canvas.utils';
import { isObject } from '@/app/utils/objectUtils';
import { getCredentialOnlyNodeTypeName } from '@/app/utils/credentialOnlyNodes';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import findLast from 'lodash/findLast';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';
import type { useWorkflowDocumentNodeMetadata } from './useWorkflowDocumentNodeMetadata';
import { isPresent } from '@/app/utils/typesUtils';
import { useNodeTypesStore } from '../nodeTypes.store';

// --- Event types ---

export type NodeAddedPayload = { node: INodeUi };
export type NodeRemovedPayload = { name: string; id: string };
export type NodeUpdatedPayload = { name: string };
export type NodesSetPayload = { nodeIds: string[] };
export type NodesResetPayload = object;

export type NodesChangeEvent =
	| ChangeEvent<NodeAddedPayload>
	| ChangeEvent<NodeRemovedPayload>
	| ChangeEvent<NodeUpdatedPayload>
	| ChangeEvent<NodesSetPayload>
	| ChangeEvent<NodesResetPayload>;

// --- Deps ---

export interface WorkflowDocumentNodesDeps {
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
	assignNodeId: (node: INodeUi) => string;
	syncWorkflowObject: (nodes: INodeUi[]) => void;
	unpinNodeData: (name: string) => void;
	nodeMetadata: ReturnType<typeof useWorkflowDocumentNodeMetadata>;
	workflowObject: Ref<Workflow>;
}

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore for reads and writes.
// The long-term goal is to remove workflowsStore entirely — workflow and
// workflowObject will become private state owned by workflowDocumentStore.
// Once that happens, the direct import (and the import-cycle warning it causes)
// will go away.
export function useWorkflowDocumentNodes(deps: WorkflowDocumentNodesDeps) {
	const nodeTypesStore = useNodeTypesStore();
	const nodes = ref<INodeUi[]>([]);

	const onNodesChange = createEventHook<NodesChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	/**
	 * Low-level node update by array index.
	 * @returns `true` if the object was changed
	 */
	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): boolean {
		if (nodeIndex === -1) return false;

		const node = nodes.value[nodeIndex];
		const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
		const changed = !isEqual(existingData, nodeData);

		if (changed) {
			Object.assign(node, nodeData);
			nodes.value[nodeIndex] = node;
			deps.syncWorkflowObject(nodes.value);
			void onNodesChange.trigger({
				action: CHANGE_ACTION.UPDATE,
				payload: { name: node.name },
			});
		}

		return changed;
	}

	// -----------------------------------------------------------------------
	// Apply methods — will become the CRDT entry point. Today they delegate.
	// -----------------------------------------------------------------------

	function applySetNodes(newNodes: INodeUi[]) {
		for (const node of newNodes) {
			if (!node.id) {
				deps.assignNodeId(node);
			}

			if (node.extendsCredential) {
				node.type = getCredentialOnlyNodeTypeName(node.extendsCredential);
			}

			if (node.position) {
				node.position = snapPositionToGrid(node.position);
			}
		}

		nodes.value = newNodes;
		deps.syncWorkflowObject(nodes.value);
		// setNodes replaces the full node list, so reset metadata to match
		deps.nodeMetadata.setAllNodeMetadata({});
		for (const node of newNodes) {
			deps.nodeMetadata.initPristineNodeMetadata(node.name);
		}
		void onNodesChange.trigger({
			action: CHANGE_ACTION.SET,
			payload: { nodeIds: newNodes.map((n) => n.id) },
		});
	}

	function applyAddNode(node: INodeUi) {
		if (!node.hasOwnProperty('name')) {
			return;
		}

		nodes.value.push(node);
		// Read back from the reactive array to get Vue's cached proxy.
		// Emitting the proxy (not the raw input) ensures ADD subscribers
		// receive a reference whose property reads are tracked and whose
		// mutations propagate reactivity. See CLAUDE.md "Reactivity invariant".
		const reactiveNode = nodes.value[nodes.value.length - 1];
		deps.syncWorkflowObject(nodes.value);
		deps.nodeMetadata.initNodeMetadata(reactiveNode.name);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { node: reactiveNode },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNode(node: INodeUi) {
		const idx = nodes.value.findIndex((n) => n.name === node.name);
		if (idx !== -1) {
			nodes.value = [...nodes.value.slice(0, idx), ...nodes.value.slice(idx + 1)];
		}

		deps.syncWorkflowObject(nodes.value);
		deps.nodeMetadata.removeNodeMetadata(node.name);
		deps.unpinNodeData(node.name);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node.name, id: node.id },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNodeById(id: string) {
		const node = nodes.value.find((n) => n.id === id);
		const idx = nodes.value.findIndex((n) => n.id === id);
		if (idx !== -1) {
			nodes.value = [...nodes.value.slice(0, idx), ...nodes.value.slice(idx + 1)];
		}
		deps.syncWorkflowObject(nodes.value);
		if (node) {
			deps.nodeMetadata.removeNodeMetadata(node.name);
			deps.unpinNodeData(node.name);
		}
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node?.name ?? '', id },
		});
		void onStateDirty.trigger();
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const allNodes = computed<INodeUi[]>(() => nodes.value);

	// Node lookup indices — maintained via onNodesChange events.
	// Only rebuilt on add/remove/set, NOT on property updates. Node objects
	// are mutated in place, so consumers reading from these indices still
	// see the latest property values without needing a rebuild.
	const nodesByName = shallowRef<Record<string, INodeUi>>({});
	const nodesById = shallowRef(new Map<string, INodeUi>());

	// Per-node canvas render data — input/output port maps keyed by node id.
	// Each node gets its own structuralComputed for inputs and outputs.
	// Lifecycle is managed via onNodesChange events — O(1) per add/remove,
	// zero cost on node updates. The structuralComputed handles reactive
	// re-evaluation (e.g. when workflowObject or node type changes) and
	// isEqual gates downstream propagation. Exposed to canvas consumers via
	// `useWorkflowDocumentRenderData(documentId)`.
	const nodeInputsByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
	);
	const nodeOutputsByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasConnectionPort[]>>(),
	);
	const nodePortScopes = new Map<string, () => void>();

	function resolveNodePortContext(nodeId: string) {
		const node = nodesById.value.get(nodeId);
		if (!node) return null;

		const nodeTypeDescription =
			nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
			nodeTypesStore.communityNodeType(node.type)?.nodeDescription ??
			null;

		const workflowObjectNode = deps.workflowObject.value.getNode(node.name);
		if (!workflowObjectNode || !nodeTypeDescription) return null;

		return { node, nodeTypeDescription, workflowObjectNode };
	}

	function computeNodeInputs(nodeId: string): CanvasConnectionPort[] {
		const ctx = resolveNodePortContext(nodeId);
		if (!ctx) return [];

		return mapLegacyEndpointsToCanvasConnectionPort(
			NodeHelpers.getNodeInputs(
				deps.workflowObject.value,
				ctx.workflowObjectNode,
				ctx.nodeTypeDescription,
			),
			ctx.nodeTypeDescription.inputNames ?? [],
		);
	}

	function computeNodeOutputs(nodeId: string): CanvasConnectionPort[] {
		const ctx = resolveNodePortContext(nodeId);
		if (!ctx) return [];

		return mapLegacyEndpointsToCanvasConnectionPort(
			NodeHelpers.getNodeOutputs(
				deps.workflowObject.value,
				ctx.workflowObjectNode,
				ctx.nodeTypeDescription,
			),
			ctx.nodeTypeDescription.outputNames ?? [],
		);
	}

	function applyAddPortEntry(nodeId: string) {
		if (nodePortScopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			nodeInputsByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeInputs(nodeId), isEqual),
			);
			nodeOutputsByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeOutputs(nodeId), isEqual),
			);
		});
		nodePortScopes.set(nodeId, () => scope.stop());
	}

	function applyRemovePortEntry(nodeId: string) {
		nodePortScopes.get(nodeId)?.();
		nodePortScopes.delete(nodeId);
		nodeInputsByNodeId.delete(nodeId);
		nodeOutputsByNodeId.delete(nodeId);
	}

	function applyReconcilePortEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);
		for (const oldId of nodePortScopes.keys()) {
			if (!nextIds.has(oldId)) applyRemovePortEntry(oldId);
		}
		for (const id of nodeIds) applyAddPortEntry(id);
	}

	function rebuildNodeIndices() {
		nodesById.value = new Map(nodes.value.map((n) => [n.id, n]));
		nodesByName.value = nodes.value.reduce<Record<string, INodeUi>>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {});
	}

	onNodesChange.on((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				nodesById.value = new Map(nodesById.value).set(node.id, node);
				nodesByName.value = { ...nodesByName.value, [node.name]: node };
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const { id, name } = event.payload as NodeRemovedPayload;
				if (id) {
					const nextById = new Map(nodesById.value);
					nextById.delete(id);
					nodesById.value = nextById;

					const { [name]: _, ...restByName } = nodesByName.value;
					nodesByName.value = restByName;
				} else {
					nodesById.value = new Map();
					nodesByName.value = {};
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				rebuildNodeIndices();
				break;
			}
		}
	});

	rebuildNodeIndices();

	// Port lifecycle — registered after the index subscription so the index
	// is fresh by the time port handlers run.
	onNodesChange.on((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				applyAddPortEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const { id } = event.payload as NodeRemovedPayload;
				if (id) {
					applyRemovePortEntry(id);
				} else {
					// removeAllNodes fires DELETE with empty payload
					applyReconcilePortEntries([]);
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				applyReconcilePortEntries(nodeIds);
				break;
			}
		}
	});

	// Initial reconciliation for nodes that exist before event subscription
	applyReconcilePortEntries(nodes.value.map((n) => n.id));

	const canvasNames = computed(() => new Set(allNodes.value.map((n) => n.name)));

	const workflowTriggerNodes = computed(() =>
		nodes.value.filter((node: INodeUi) => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType && nodeType.group.includes('trigger');
		}),
	);

	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter(
			(node) =>
				node.type.includes('langchain') ||
				(node.type === 'n8n-nodes-base.evaluation' && node.parameters?.operation === 'setMetrics'),
		),
	);

	function getNodeById(id: string): INodeUi | undefined {
		return nodesById.value.get(id);
	}

	function getNodeByName(name: string): INodeUi | null {
		return nodesByName.value[name] ?? null;
	}

	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		return nodes.value.find((node) => node.id.startsWith(partialId));
	}

	function getNodesByIds(nodeIds: string[]): INodeUi[] {
		return nodeIds.map(getNodeById).filter(isPresent);
	}

	// -----------------------------------------------------------------------
	// Write API
	// -----------------------------------------------------------------------

	function setNodes(nodes: INodeUi[]): void {
		applySetNodes(nodes);
	}

	function addNode(node: INodeUi): void {
		applyAddNode(node);
	}

	function removeNode(node: INodeUi): void {
		applyRemoveNode(node);
	}

	function removeNodeById(id: string): void {
		applyRemoveNodeById(id);
	}

	function setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

		if (nodeIndex === -1) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const { name, parameters } = nodes.value[nodeIndex];

		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...parameters, ...updateInformation.value }
				: updateInformation.value;

		const changed = updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			void onStateDirty.trigger();
			deps.nodeMetadata.touchParametersLastUpdatedAt(name);
		}
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(nodes.value, (node) => node.type === updateInformation.key);
		if (!latestNode) return;

		const nodeType = deps.getNodeType(latestNode.type);
		if (!nodeType) return;

		const nodeParams = NodeHelpers.getNodeParameters(
			nodeType.properties,
			updateInformation.value as INodeParameters,
			true,
			false,
			latestNode,
			nodeType,
		);

		setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
	}

	function setNodeValue(updateInformation: IUpdateInformation): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

		if (nodeIndex === -1 || !updateInformation.key) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const changed = updateNodeAtIndex(nodeIndex, {
			[updateInformation.key]: updateInformation.value,
		});

		if (changed) {
			void onStateDirty.trigger();
		}

		const excludeKeys = ['position', 'notes', 'notesInFlow'];

		if (changed && !excludeKeys.includes(updateInformation.key)) {
			deps.nodeMetadata.touchParametersLastUpdatedAt(nodes.value[nodeIndex].name);
		}
	}

	function setNodePositionById(id: string, position: XYPosition): void {
		const node = nodes.value.find((n) => n.id === id);
		if (!node) return;

		setNodeValue({ name: node.name, key: 'position', value: position });
	}

	function updateNodeById(nodeId: string, nodeData: Partial<INodeUi>): boolean {
		const nodeIndex = nodes.value.findIndex((node) => node.id === nodeId);
		if (nodeIndex === -1) return false;
		return updateNodeAtIndex(nodeIndex, nodeData);
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

		if (nodeIndex !== -1) {
			for (const key of Object.keys(updateInformation.properties)) {
				const typedKey = key as keyof INodeUpdatePropertiesInformation['properties'];
				const property = updateInformation.properties[typedKey];

				const changed = updateNodeAtIndex(nodeIndex, { [key]: property });

				if (changed) {
					void onStateDirty.trigger();
				}
			}
		}
	}

	function setNodeIssue(nodeIssueData: INodeIssueData): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === nodeIssueData.node);
		if (nodeIndex === -1) {
			return;
		}

		const node = nodes.value[nodeIndex];

		if (nodeIssueData.value === null) {
			if (node.issues?.[nodeIssueData.type] === undefined) {
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeIssueData.type]: _removedNodeIssue, ...remainingNodeIssues } = node.issues;
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

	function removeAllNodes(): void {
		nodes.value.splice(0, nodes.value.length);
		deps.syncWorkflowObject(nodes.value);
		deps.nodeMetadata.setAllNodeMetadata({});
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: {},
		});
	}

	function resetAllNodesIssues(): boolean {
		nodes.value.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	// replace invalid credentials in workflow
	function replaceInvalidWorkflowCredentials(data: {
		credentials: INodeCredentialsDetails;
		invalid: INodeCredentialsDetails;
		type: string;
	}) {
		nodes.value.forEach((node: INodeUi) => {
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

		nodes.value.forEach((node: INodeUi) => {
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
				!NodeHelpers.displayParameterPath(
					node.parameters,
					credentialDescription,
					'',
					node,
					node?.type ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null,
				)
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

	return {
		// Read
		allNodes,
		nodesByName,
		nodesById,
		nodeInputsByNodeId,
		nodeOutputsByNodeId,
		canvasNames,
		workflowTriggerNodes,
		aiNodes,
		getNodeById,
		getNodeByName,
		findNodeByPartialId,
		getNodesByIds,

		// Write
		setNodes,
		addNode,
		removeNode,
		removeNodeById,
		setNodeParameters,
		setNodeValue,
		setNodePositionById,
		updateNodeProperties,
		updateNodeById,
		setNodeIssue,
		removeAllNodes,
		resetAllNodesIssues,
		setLastNodeParameters,
		replaceInvalidWorkflowCredentials,
		assignCredentialToMatchingNodes,

		// Events
		onNodesChange: onNodesChange.on,
		onStateDirty: onStateDirty.on,
	};
}
