<script lang="ts" setup>
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	GRID_SIZE,
	DEFAULT_NODE_SIZE,
	getNewNodePosition,
	snapPositionToGrid,
} from '@/app/utils/nodeViewUtils';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import {
	createCanvasConnectionHandleString,
	createCanvasConnectionId,
} from '@/features/workflows/canvas/canvas.utils';
import { useCanvasTraversal } from '@/features/workflows/canvas/composables/useCanvasTraversal';
import NodeCreation from '@/features/shared/nodeCreator/views/NodeCreation.vue';
import type { AddedNodesAndConnections, INodeUi, ToggleNodeCreatorOptions } from '@/Interface';
import type { Connection } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { provide, ref } from 'vue';
import { useWorkflowAwareness } from '../composables/useWorkflowAwareness';
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import { useExecutionDoc } from '../composables/useExecutionDoc';
import { WorkflowAwarenessKey } from '../types/awareness.types';
import type { WorkflowEdge, WorkflowNode } from '../types/workflowDocument.types';
import CrdtNodeDetailsPanel from './CrdtNodeDetailsPanel.vue';
import CrdtPinnedDataTestPanel from './CrdtPinnedDataTestPanel.vue';
import WorkflowCanvas from './WorkflowCanvas.vue';
import { executeWorkflow } from '@/app/workers/coordinator';
import { useRootStore } from '@n8n/stores/useRootStore';

const doc = useWorkflowDoc();
// Create awareness at the parent level and provide for children
const awareness = useWorkflowAwareness({ awareness: doc.awareness });
provide(WorkflowAwarenessKey, awareness);

// Create execution document and provide for children (nodes/edges)
const executionDoc = useExecutionDoc({ workflowId: doc.workflowId, immediate: true });
provide('executionDoc', executionDoc);

const rootStore = useRootStore();

// Track execution state
const isExecuting = ref(false);

/**
 * Execute the workflow via the Coordinator.
 * The Coordinator has the up-to-date Workflow instance synced with CRDT.
 */
async function handleExecute() {
	if (isExecuting.value) {
		return;
	}

	const workflowId = doc.workflowId;
	const baseUrl = rootStore.baseUrl;

	isExecuting.value = true;
	try {
		await executeWorkflow(workflowId, baseUrl);
	} finally {
		// Reset after a delay to allow execution to complete
		// The actual completion is tracked via push events in the coordinator
		setTimeout(() => {
			isExecuting.value = false;
		}, 2000);
	}
}

// Use instanceId for Vue Flow so each view has independent viewport state
const instance = useVueFlow(doc.instanceId);
const { getDownstreamNodes } = useCanvasTraversal(instance);
const selectedNode = ref<string | null>(null);

// Dummy state for NodeCreation props
const createNodeActive = ref(false);
const nodeViewScale = ref(1);
const focusPanelActive = ref(false);

const nodeTypesStore = useNodeTypesStore();

/**
 * Generate a unique node name by checking existing nodes in the CRDT document.
 * Appends a number suffix if the name already exists (e.g., "AI Agent" -> "AI Agent1" -> "AI Agent2")
 */
function generateUniqueNodeName(baseName: string, additionalNames: string[] = []): string {
	const existingNames = new Set([...doc.getNodes().map((n) => n.name), ...additionalNames]);

	if (!existingNames.has(baseName)) {
		return baseName;
	}

	// Try appending numbers until we find a unique name
	let counter = 1;
	while (existingNames.has(`${baseName}${counter}`)) {
		counter++;
	}
	return `${baseName}${counter}`;
}

/**
 * Check if the CRDT graph already contains a trigger node.
 * Uses the directed graph structure to avoid depending on workflows store.
 */
function graphHasTrigger(): boolean {
	const nodes = doc.getNodes();
	return nodes.some((node) => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		return nodeType?.group.includes('trigger') ?? false;
	});
}

function requireNodeTypeDescription(
	type: INodeUi['type'],
	version?: INodeUi['typeVersion'],
): INodeTypeDescription {
	const nodeType =
		nodeTypesStore.getNodeType(type, version) ??
		nodeTypesStore.communityNodeType(type)?.nodeDescription;

	if (nodeType) {
		return nodeType;
	}

	// Fallback for unknown node types
	return {
		properties: [],
		displayName: type,
		name: type,
		group: [],
		description: '',
		version: version ?? 1,
		defaults: { name: type },
		inputs: [],
		outputs: [],
	} as INodeTypeDescription;
}

// Track the node that was selected when opening the node creator (for auto-connect)
const lastSelectedNodeId = ref<string | null>(null);

// Track the connection to insert a new node into (when clicking + on an edge)
const insertBetweenConnection = ref<Connection | null>(null);

const onToggleNodeCreator = (options: ToggleNodeCreatorOptions) => {
	// Capture selected node when opening the creator
	if (options.createNodeActive && !createNodeActive.value) {
		const selectedNodes = instance.getSelectedNodes.value;
		lastSelectedNodeId.value = selectedNodes.length === 1 ? selectedNodes[0].id : null;
	}
	createNodeActive.value = options.createNodeActive ?? !createNodeActive.value;
};

/**
 * Get the center position of the current viewport for node insertion.
 */
function getViewportCenter(): [number, number] {
	const { x, y, zoom } = instance.viewport.value;
	const { width, height } = instance.dimensions.value;
	// Convert viewport center to canvas coordinates
	const centerX = (-x + width / 2) / zoom;
	const centerY = (-y + height / 2) / zoom;
	return [centerX, centerY];
}

/**
 * Handle click on edge plus button - opens node creator to insert a node between two connected nodes.
 */
function onClickConnectionAdd(connection: Connection) {
	insertBetweenConnection.value = connection;
	createNodeActive.value = true;
}

/**
 * Shift downstream nodes to make room for a new node insertion.
 * Only shifts if there isn't enough space, and only by the amount needed.
 * Uses Vue Flow's graph traversal utilities.
 */
function shiftDownstreamNodes(
	sourceNodeId: string,
	insertPosition: [number, number],
	insertedNodeSize: [number, number] = DEFAULT_NODE_SIZE,
): void {
	// Use Vue Flow's built-in graph traversal
	const allDownstream = getDownstreamNodes(sourceNodeId);

	// Filter to nodes at similar Y position
	const yTolerance = DEFAULT_NODE_SIZE[1] * 2;
	const downstreamNodes = allDownstream.filter(
		(node) => Math.abs(node.position.y - insertPosition[1]) <= yTolerance,
	);

	if (downstreamNodes.length === 0) return;

	// Find leftmost to check available space
	const leftmostDownstream = downstreamNodes.reduce((left, node) =>
		node.position.x < left.position.x ? node : left,
	);

	// Check if we need to shift
	const insertedNodeRightEdge = insertPosition[0] + insertedNodeSize[0] + GRID_SIZE;
	const availableSpace = leftmostDownstream.position.x - insertedNodeRightEdge;
	if (availableSpace >= 0) return;

	// Shift by the amount needed to create space
	const shiftAmount = Math.abs(availableSpace) + GRID_SIZE;

	// Update positions via CRDT
	const positionUpdates = downstreamNodes.map((node) => ({
		nodeId: node.id,
		position: snapPositionToGrid([node.position.x + shiftAmount, node.position.y]) as [
			number,
			number,
		],
	}));

	doc.updateNodePositions(positionUpdates);

	// Update Vue Flow for immediate visual feedback
	for (const update of positionUpdates) {
		const vueFlowNode = instance.findNode(update.nodeId);
		if (vueFlowNode) {
			vueFlowNode.position = { x: update.position[0], y: update.position[1] };
		}
	}
}

const onAddNodesAndConnections = (payload: AddedNodesAndConnections) => {
	// Filter out auto-added trigger nodes if trigger already exists in graph
	// NodeCreation's useActions adds triggers automatically, but we check the CRDT graph directly
	const hasTrigger = graphHasTrigger();
	let nodes = payload.nodes;
	let connections = payload.connections ?? [];

	if (hasTrigger) {
		// Find indices of auto-added trigger nodes to remove
		const triggerIndices = new Set<number>();
		nodes.forEach((node, index) => {
			if (node.isAutoAdd) {
				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (nodeType?.group.includes('trigger')) {
					triggerIndices.add(index);
				}
			}
		});

		if (triggerIndices.size > 0) {
			// Remove trigger nodes and remap connection indices
			const indexMap = new Map<number, number>();
			let newIndex = 0;
			nodes = nodes.filter((_, index) => {
				if (triggerIndices.has(index)) {
					return false;
				}
				indexMap.set(index, newIndex++);
				return true;
			});

			// Remap connections, removing any that reference removed triggers
			connections = connections
				.filter(
					(conn) =>
						!triggerIndices.has(conn.from.nodeIndex) && !triggerIndices.has(conn.to.nodeIndex),
				)
				.map((conn) => ({
					...conn,
					from: { ...conn.from, nodeIndex: indexMap.get(conn.from.nodeIndex)! },
					to: { ...conn.to, nodeIndex: indexMap.get(conn.to.nodeIndex)! },
				}));
		}
	}

	// Track names of nodes being added in this batch to avoid duplicates within the same transaction
	const namesInBatch: string[] = [];
	const nodesToAdd: WorkflowNode[] = [];

	// Get existing nodes from the graph for collision detection
	const existingNodes = doc.getNodes();

	// Find the selected node to position relative to and connect from
	const selectedNode = lastSelectedNodeId.value
		? existingNodes.find((n) => n.id === lastSelectedNodeId.value)
		: null;

	// Determine insert position based on context
	let insertPosition: [number, number];

	if (insertBetweenConnection.value) {
		// Insert between: position right after source node (downstream nodes will be shifted if needed)
		const conn = insertBetweenConnection.value;
		const sourceNode = existingNodes.find((n) => n.id === conn.source);

		if (sourceNode) {
			// Position to the right of source with standard spacing
			const sourceWidth = sourceNode.size?.[0] ?? DEFAULT_NODE_SIZE[0];
			insertPosition = [
				sourceNode.position[0] + sourceWidth + GRID_SIZE * 2,
				sourceNode.position[1],
			];
		} else {
			insertPosition = getViewportCenter();
		}
	} else if (selectedNode) {
		// Selected node: position to its right
		const selectedNodeWidth = selectedNode.size?.[0] ?? DEFAULT_NODE_SIZE[0];
		insertPosition = [
			selectedNode.position[0] + selectedNodeWidth + DEFAULT_NODE_SIZE[0] + GRID_SIZE,
			selectedNode.position[1],
		];
	} else {
		// Default: viewport center
		insertPosition = getViewportCenter();
	}

	// For insert-between, skip collision detection since we're deliberately placing at the midpoint
	const skipCollisionDetection = !!insertBetweenConnection.value;

	for (const node of nodes) {
		try {
			const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);

			let typeVersion: number;
			if (node.typeVersion !== undefined) {
				typeVersion = node.typeVersion;
			} else if (Array.isArray(nodeTypeDescription.version)) {
				typeVersion = nodeTypeDescription.version[nodeTypeDescription.version.length - 1];
			} else {
				typeVersion = nodeTypeDescription.version;
			}

			// Calculate position - skip collision detection for insert-between to prevent Y jumps
			const position = getNewNodePosition(
				[...existingNodes, ...nodesToAdd] as INodeUi[],
				insertPosition,
				{ normalize: !skipCollisionDetection },
			);

			// Update insert position for next node - increment X horizontally (like production)
			insertPosition = [position[0] + DEFAULT_NODE_SIZE[0] * 2 + GRID_SIZE, position[1]];

			const baseName =
				node.name ??
				(typeof nodeTypeDescription.defaults.name === 'string'
					? nodeTypeDescription.defaults.name
					: nodeTypeDescription.displayName);

			// Generate a unique name considering both existing nodes and nodes being added in this batch
			const name = generateUniqueNodeName(baseName, namesInBatch);
			namesInBatch.push(name);

			// Create a temporary node object to pass to getNodeParameters
			const tempNode = {
				id: crypto.randomUUID(),
				name,
				type: node.type,
				typeVersion,
				position,
				parameters: {},
			};

			// Resolve parameters with defaults (like the main editor does)
			// This ensures dynamic inputs/outputs get the correct default parameter values
			const resolvedParameters =
				NodeHelpers.getNodeParameters(
					nodeTypeDescription.properties,
					tempNode.parameters,
					true, // returnDefaults
					false, // returnNoneDisplayed
					tempNode,
					nodeTypeDescription,
				) ?? {};

			nodesToAdd.push({
				...tempNode,
				parameters: resolvedParameters,
			});
		} catch {
			continue;
		}
	}

	if (nodesToAdd.length > 0) {
		const { off } = instance.onNodesInitialized(() => {
			instance.addSelectedNodes(nodesToAdd.map((n) => instance.findNode(n.id)!));
			instance.nodesSelectionActive.value = true;
			off();
		});
	}

	// Convert connections to edges using production utilities
	const edgesToAdd: WorkflowEdge[] = [];

	// Auto-connect from selected node to first non-auto-add node (like production)
	if (selectedNode && nodesToAdd.length > 0) {
		// Find the first non-auto-add node (the "main" node being added)
		const firstNonAutoAddIndex = nodes.findIndex((n) => !n.isAutoAdd);
		const targetNode = firstNonAutoAddIndex >= 0 ? nodesToAdd[firstNonAutoAddIndex] : nodesToAdd[0];

		if (targetNode) {
			const sourceHandle = createCanvasConnectionHandleString({
				mode: 'outputs',
				type: NodeConnectionTypes.Main,
				index: 0,
			});
			const targetHandle = createCanvasConnectionHandleString({
				mode: 'inputs',
				type: NodeConnectionTypes.Main,
				index: 0,
			});
			const edgeId = createCanvasConnectionId({
				source: selectedNode.id,
				sourceHandle,
				target: targetNode.id,
				targetHandle,
			});

			edgesToAdd.push({
				id: edgeId,
				source: selectedNode.id,
				target: targetNode.id,
				sourceHandle,
				targetHandle,
			});
		}
	}

	// Add connections from the payload (for multi-node templates)
	if (connections.length > 0) {
		for (const conn of connections) {
			const sourceNode = nodesToAdd[conn.from.nodeIndex];
			const targetNode = nodesToAdd[conn.to.nodeIndex];

			if (!sourceNode || !targetNode) {
				continue;
			}

			// Get connection types with validation, fallback to Main if invalid
			const rawSourceType = conn.from.type ?? NodeConnectionTypes.Main;
			const rawTargetType = conn.to.type ?? NodeConnectionTypes.Main;
			const sourceType = isValidNodeConnectionType(rawSourceType)
				? rawSourceType
				: NodeConnectionTypes.Main;
			const targetType = isValidNodeConnectionType(rawTargetType)
				? rawTargetType
				: NodeConnectionTypes.Main;

			const sourceIndex = conn.from.outputIndex ?? 0;
			const targetIndex = conn.to.inputIndex ?? 0;

			// Use production utilities for handle string creation
			const sourceHandle = createCanvasConnectionHandleString({
				mode: 'outputs',
				type: sourceType,
				index: sourceIndex,
			});
			const targetHandle = createCanvasConnectionHandleString({
				mode: 'inputs',
				type: targetType,
				index: targetIndex,
			});

			// Use production utility for edge ID
			const edgeId = createCanvasConnectionId({
				source: sourceNode.id,
				sourceHandle,
				target: targetNode.id,
				targetHandle,
			});

			edgesToAdd.push({
				id: edgeId,
				source: sourceNode.id,
				target: targetNode.id,
				sourceHandle,
				targetHandle,
			});
		}
	}

	// Handle "insert between" case - when adding a node from an edge plus button
	let edgesToRemove: string[] = [];
	if (insertBetweenConnection.value && nodesToAdd.length > 0) {
		const conn = insertBetweenConnection.value;
		const insertedNode = nodesToAdd[0]; // Insert the first node between

		// Shift downstream nodes to make room for the inserted node
		shiftDownstreamNodes(
			conn.source,
			insertedNode.position,
			insertedNode.size ?? DEFAULT_NODE_SIZE,
		);

		// Remove the original edge
		const originalEdgeId = createCanvasConnectionId({
			source: conn.source,
			sourceHandle: conn.sourceHandle ?? '',
			target: conn.target ?? '',
			targetHandle: conn.targetHandle ?? '',
		});
		edgesToRemove = [originalEdgeId];

		// Create edge from original source to inserted node
		const sourceToInsertedHandle = createCanvasConnectionHandleString({
			mode: 'inputs',
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const sourceToInsertedId = createCanvasConnectionId({
			source: conn.source,
			sourceHandle: conn.sourceHandle ?? '',
			target: insertedNode.id,
			targetHandle: sourceToInsertedHandle,
		});
		edgesToAdd.push({
			id: sourceToInsertedId,
			source: conn.source,
			target: insertedNode.id,
			sourceHandle: conn.sourceHandle ?? '',
			targetHandle: sourceToInsertedHandle,
		});

		// Create edge from inserted node to original target
		if (conn.target) {
			const insertedToTargetHandle = createCanvasConnectionHandleString({
				mode: 'outputs',
				type: NodeConnectionTypes.Main,
				index: 0,
			});
			const insertedToTargetId = createCanvasConnectionId({
				source: insertedNode.id,
				sourceHandle: insertedToTargetHandle,
				target: conn.target,
				targetHandle: conn.targetHandle ?? '',
			});
			edgesToAdd.push({
				id: insertedToTargetId,
				source: insertedNode.id,
				target: conn.target,
				sourceHandle: insertedToTargetHandle,
				targetHandle: conn.targetHandle ?? '',
			});
		}
	}

	// Remove old edges first (for insert between), then add nodes and new edges
	if (edgesToRemove.length > 0) {
		for (const edgeId of edgesToRemove) {
			doc.removeEdge(edgeId);
			instance.removeEdges([edgeId]);
		}
	}

	// Add nodes and edges in a single atomic transaction
	doc.addNodesAndEdges(nodesToAdd, edgesToAdd);

	// Clear state
	lastSelectedNodeId.value = null;
	insertBetweenConnection.value = null;
	createNodeActive.value = false;
};

const onNodeCreatorClose = () => {
	createNodeActive.value = false;
	insertBetweenConnection.value = null;
};

instance.onNodeDoubleClick(({ node }) => {
	selectedNode.value = node.id;
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.toolbar">
			<button :disabled="!doc.canUndo.value" :class="$style.button" @click="doc.undo()">
				Undo
			</button>
			<button :disabled="!doc.canRedo.value" :class="$style.button" @click="doc.redo()">
				Redo
			</button>
			<span v-if="awareness.isReady.value" :class="$style.collaborators">
				{{ awareness.collaboratorCount.value }} online
			</span>
		</div>
		<button
			v-if="doc.isReady.value"
			:disabled="isExecuting"
			:class="$style.executeButton"
			@click="handleExecute"
		>
			{{ isExecuting ? 'Executing...' : 'Execute Workflow' }}
		</button>
		<WorkflowCanvas v-if="doc.isReady.value" @click:connection:add="onClickConnectionAdd" />
		<div v-else-if="doc.state.value === 'connecting'" :class="$style.loading">
			Connecting to workflow...
		</div>
		<div v-else-if="doc.state.value === 'error'" :class="$style.error">
			<h2>Error Loading CRDT Workflow</h2>
			<p>{{ doc.error.value }}</p>
		</div>
		<NodeCreation
			:create-node-active="createNodeActive"
			:node-view-scale="nodeViewScale"
			:focus-panel-active="focusPanelActive"
			@toggle-node-creator="onToggleNodeCreator"
			@add-nodes="onAddNodesAndConnections"
			@close="onNodeCreatorClose"
		/>
		<CrdtNodeDetailsPanel v-if="doc.isReady.value" v-model="selectedNode" />
		<CrdtPinnedDataTestPanel v-if="doc.isReady.value" v-model="selectedNode" />
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	width: 100%;
	height: 100%;
}

.toolbar {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 100;
	display: flex;
	gap: var(--spacing--2xs);
}

.button {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover:not(:disabled) {
		background: var(--color--foreground--tint-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	font-size: var(--font-size--lg);
	color: var(--color--text--tint-1);
}

.error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--danger);

	h2 {
		margin-bottom: var(--spacing--sm);
	}
}

.collaborators {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.executeButton {
	position: fixed;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--md);
	border: none;
	border-radius: var(--radius);
	background: var(--color--primary);
	color: white;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	z-index: 1000;
	transition: background-color 0.2s ease;

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}
</style>
