/**
 * Composable for updating workflows with new data from the AI Builder.
 * Handles update-in-place logic: updates existing nodes by ID, adds new nodes,
 * removes stale nodes, handles renames, and preserves pinned data.
 */
import { DEFAULT_NEW_WORKFLOW_NAME } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { mapLegacyConnectionsToCanvasConnections } from '@/features/workflows/canvas/canvas.utils';
import { getAuthTypeForNodeCredential, getMainAuthField } from '@/app/utils/nodeTypesUtils';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type { IConnections, INode, INodeExecutionData } from 'n8n-workflow';
import isEqual from 'lodash/isEqual';

export interface UpdateWorkflowOptions {
	isInitialGeneration?: boolean;
	/** Node IDs to tidy up (in addition to any newly added nodes) */
	nodeIdsToTidyUp?: string[];
}

export interface UpdateWorkflowResult {
	success: boolean;
	/** IDs of nodes that were newly added */
	newNodeIds: string[];
}

export function useWorkflowUpdate() {
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const builderStore = useBuilderStore();
	const canvasOperations = useCanvasOperations();

	/**
	 * Capture pinned data by node ID (not name) to survive renames
	 */
	function capturePinnedDataById(): Map<string, INodeExecutionData[]> {
		const pinnedDataById = new Map<string, INodeExecutionData[]>();
		workflowsStore.allNodes.forEach((node) => {
			const pinData = workflowsStore.workflow.pinData?.[node.name];
			if (pinData) {
				pinnedDataById.set(node.id, pinData);
			}
		});
		return pinnedDataById;
	}

	/**
	 * Categorize nodes into those to update, add, or remove
	 */
	function categorizeNodes(workflowData: WorkflowDataUpdate) {
		const newNodesById = new Map(workflowData.nodes?.map((n) => [n.id, n]) ?? []);
		const existingNodesById = new Map(workflowsStore.allNodes.map((n) => [n.id, n]));

		const nodesToUpdate: Array<{ existing: INodeUi; updated: INode }> = [];
		const nodesToAdd: INode[] = [];
		const nodesToRemove: INodeUi[] = [];

		workflowData.nodes?.forEach((newNode) => {
			const existing = existingNodesById.get(newNode.id);
			if (existing) {
				nodesToUpdate.push({ existing, updated: newNode });
			} else {
				nodesToAdd.push(newNode);
			}
		});

		existingNodesById.forEach((node, id) => {
			if (!newNodesById.has(id)) {
				nodesToRemove.push(node);
			}
		});

		return { nodesToUpdate, nodesToAdd, nodesToRemove };
	}

	/**
	 * Update existing nodes in place, handling renames via workflow.renameNode()
	 */
	function updateExistingNodes(nodesToUpdate: Array<{ existing: INodeUi; updated: INode }>): void {
		if (nodesToUpdate.length === 0) return;

		const workflow = workflowsStore.cloneWorkflowObject();

		for (const { existing, updated } of nodesToUpdate) {
			const node = workflow.nodes[existing.name];
			if (!node) continue;

			// Update node properties, preserving position
			Object.assign(node, {
				...updated,
				position: existing.position,
				name: existing.name, // Keep old name until rename
			});

			// Apply rename if name changed (updates connections/expressions)
			if (existing.name !== updated.name) {
				workflow.renameNode(existing.name, updated.name);
			}

			// Mark node as dirty if parameters changed
			if (!isEqual(existing.parameters, updated.parameters)) {
				workflowState.resetParametersLastUpdatedAt(updated.name);
			}
		}

		// Sync state back to store
		workflowsStore.setNodes(Object.values(workflow.nodes));
		workflowsStore.setConnections(workflow.connectionsBySourceNode);
	}

	/**
	 * Remove stale nodes that are no longer in the update
	 */
	function removeStaleNodes(nodesToRemove: INodeUi[]): void {
		for (const node of nodesToRemove) {
			canvasOperations.deleteNode(node.id, { trackHistory: true, trackBulk: false });
		}
	}

	/**
	 * Add new nodes via canvas operations
	 */
	async function addNewNodes(nodesToAdd: INode[]): Promise<INodeUi[]> {
		if (nodesToAdd.length === 0) return [];

		const addedNodes = await canvasOperations.addNodes(
			nodesToAdd.map((node) => ({ ...node })),
			{
				trackHistory: true,
				trackBulk: false,
				forcePosition: true,
				telemetry: false,
			},
		);

		return addedNodes;
	}

	/**
	 * Helper to compare canvas connections
	 */
	function isSameConnection(
		a: {
			source: string;
			target: string;
			sourceHandle?: string | null;
			targetHandle?: string | null;
		},
		b: {
			source: string;
			target: string;
			sourceHandle?: string | null;
			targetHandle?: string | null;
		},
	): boolean {
		return (
			a.source === b.source &&
			a.target === b.target &&
			a.sourceHandle === b.sourceHandle &&
			a.targetHandle === b.targetHandle
		);
	}

	/**
	 * Update connections - remove old, add new
	 */
	async function updateConnections(newConnections: IConnections): Promise<void> {
		const existingConnections = workflowsStore.workflow.connections;

		// Convert to canvas format for comparison
		const existingCanvasConnections = mapLegacyConnectionsToCanvasConnections(
			existingConnections,
			workflowsStore.allNodes,
		);
		const newCanvasConnections = mapLegacyConnectionsToCanvasConnections(
			newConnections,
			workflowsStore.allNodes,
		);

		// Find connections to remove (exist in current but not in new)
		const connectionsToRemove = existingCanvasConnections.filter(
			(existing) => !newCanvasConnections.some((newConn) => isSameConnection(existing, newConn)),
		);

		// Find connections to add (exist in new but not in current)
		const connectionsToAdd = newCanvasConnections.filter(
			(newConn) =>
				!existingCanvasConnections.some((existing) => isSameConnection(existing, newConn)),
		);

		// Remove old connections
		for (const connection of connectionsToRemove) {
			canvasOperations.deleteConnection(connection, {
				trackHistory: true,
				trackBulk: false,
			});
		}

		// Add new connections
		if (connectionsToAdd.length > 0) {
			await canvasOperations.addConnections(connectionsToAdd, {
				trackHistory: true,
				trackBulk: false,
			});
		}
	}

	/**
	 * Restore pinned data by node ID to current node names
	 */
	function restorePinnedData(pinnedDataById: Map<string, INodeExecutionData[]>): void {
		workflowsStore.allNodes.forEach((node) => {
			const savedPinData = pinnedDataById.get(node.id);
			if (savedPinData) {
				workflowsStore.workflow.pinData = {
					...workflowsStore.workflow.pinData,
					[node.name]: savedPinData,
				};
			}
		});
	}

	/**
	 * Set default credentials for nodes without credentials
	 */
	function applyDefaultCredentials(nodes: INode[]): void {
		nodes.forEach((node) => {
			const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
			if (hasCredentials) return;

			const nodeType = nodeTypesStore.getNodeType(node.type);
			if (!nodeType?.credentials) return;

			// Try to find and set the first available credential
			for (const credentialConfig of nodeType.credentials) {
				const credentials = credentialsStore.getCredentialsByType(credentialConfig.name);
				if (!credentials || credentials.length === 0) continue;

				const credential = credentials[0];
				const existingNode = workflowsStore.getNodeByName(node.name);
				if (!existingNode) continue;

				existingNode.credentials = {
					[credential.type]: {
						id: credential.id,
						name: credential.name,
					},
				};

				const authField = getMainAuthField(nodeType);
				const authType = getAuthTypeForNodeCredential(nodeType, credentialConfig);
				if (authField && authType) {
					existingNode.parameters[authField.name] = authType.value;
				}

				break;
			}
		});
	}

	/**
	 * Update workflow name if initial generation and name starts with default
	 */
	function updateWorkflowNameIfNeeded(name?: string, isInitialGeneration?: boolean): void {
		if (
			name &&
			isInitialGeneration &&
			workflowsStore.workflow.name.startsWith(DEFAULT_NEW_WORKFLOW_NAME)
		) {
			workflowState.setWorkflowName({ newName: name, setStateDirty: false });
		}
	}

	/**
	 * Tidy up new node positions
	 */
	function tidyUpNewNodes(nodeIds: string[]): void {
		if (nodeIds.length === 0) {
			return;
		}

		canvasEventBus.emit('tidyUp', {
			source: 'builder-update',
			nodeIdsFilter: nodeIds,
			trackEvents: false,
			trackHistory: true,
			trackBulk: false,
		});
	}

	/**
	 * Updates workflow with new data, preserving existing node positions
	 * and handling renames, additions, and removals efficiently.
	 * Note: Undo recording should be managed by the caller (e.g., start when streaming begins, stop when it ends).
	 */
	async function updateWorkflow(
		workflowData: WorkflowDataUpdate,
		options?: UpdateWorkflowOptions,
	): Promise<UpdateWorkflowResult> {
		const pinnedDataById = capturePinnedDataById();
		const { nodesToUpdate, nodesToAdd, nodesToRemove } = categorizeNodes(workflowData);

		updateExistingNodes(nodesToUpdate);
		removeStaleNodes(nodesToRemove);
		const addedNodes = await addNewNodes(nodesToAdd);
		const newNodeIds = addedNodes.map((n) => n.id);
		await updateConnections(workflowData.connections ?? {});
		restorePinnedData(pinnedDataById);
		applyDefaultCredentials(workflowData.nodes ?? []);
		updateWorkflowNameIfNeeded(workflowData.name, options?.isInitialGeneration);

		builderStore.setBuilderMadeEdits(true);

		// Combine newly added node IDs with any additional IDs from previous messages
		const allNodeIdsToTidyUp = [...newNodeIds, ...(options?.nodeIdsToTidyUp ?? [])];
		tidyUpNewNodes(allNodeIdsToTidyUp);

		return { success: true, newNodeIds };
	}

	return { updateWorkflow };
}
