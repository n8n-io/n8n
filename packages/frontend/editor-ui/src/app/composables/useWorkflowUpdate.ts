/**
 * Composable for updating workflows with new data from the AI Builder.
 * Handles update-in-place logic: updates existing nodes by ID, adds new nodes,
 * removes stale nodes, and handles renames.
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
import type { IConnections, INode } from 'n8n-workflow';
import isEqual from 'lodash/isEqual';

export interface UpdateWorkflowOptions {
	isInitialGeneration?: boolean;
	/** Node IDs to tidy up (in addition to any newly added nodes) */
	nodeIdsToTidyUp?: string[];
}

export type UpdateWorkflowResult =
	| {
			success: true;
			/** IDs of nodes that were newly added */
			newNodeIds: string[];
	  }
	| {
			success: false;
			error: unknown;
	  };

export function useWorkflowUpdate() {
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const builderStore = useBuilderStore();
	const canvasOperations = useCanvasOperations();

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
	 * Update existing nodes in place, handling renames via canvasOperations.renameNode()
	 * which properly updates pinData, nodeMetadata, runData, etc.
	 */
	async function updateExistingNodes(
		nodesToUpdate: Array<{ existing: INodeUi; updated: INode }>,
	): Promise<void> {
		if (nodesToUpdate.length === 0) return;

		// Track successful renames (nodeId -> newName)
		const renamedNodes = new Map<string, string>();

		// First handle renames via canvasOperations (handles pinData, metadata, etc.)
		for (const { existing, updated } of nodesToUpdate) {
			if (existing.name !== updated.name) {
				const success = await canvasOperations.renameNode(existing.name, updated.name, {
					trackHistory: true,
					trackBulk: false,
					showErrorToast: false,
				});
				if (success) {
					renamedNodes.set(existing.id, updated.name);
				}
			}
		}

		// Then update other node properties on the (possibly renamed) nodes
		const workflow = workflowsStore.cloneWorkflowObject();

		for (const { existing, updated } of nodesToUpdate) {
			// Use new name only if rename succeeded, otherwise use old name
			const nodeName = renamedNodes.get(existing.id) ?? existing.name;
			const node = workflow.nodes[nodeName];
			if (!node) continue;

			// Update node properties, preserving position and current name
			Object.assign(node, {
				...updated,
				position: existing.position,
				name: nodeName, // Keep actual name (old if rename failed)
			});

			// Mark node as dirty if parameters changed
			if (!isEqual(existing.parameters, updated.parameters)) {
				workflowState.resetParametersLastUpdatedAt(nodeName);
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
			(a.sourceHandle ?? null) === (b.sourceHandle ?? null) &&
			(a.targetHandle ?? null) === (b.targetHandle ?? null)
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
	 * Set default credentials on nodes that don't have any (mutates input array).
	 * Must be called BEFORE nodes are added to store to avoid direct store mutation.
	 */
	function setDefaultCredentialsOnNodes(nodes: INode[]): void {
		for (const node of nodes) {
			const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
			if (hasCredentials) continue;

			const nodeType = nodeTypesStore.getNodeType(node.type);
			if (!nodeType?.credentials) continue;

			for (const credentialConfig of nodeType.credentials) {
				const credentials = credentialsStore.getCredentialsByType(credentialConfig.name);
				if (!credentials || credentials.length === 0) continue;

				const credential = credentials[0];
				node.credentials = {
					[credential.type]: {
						id: credential.id,
						name: credential.name,
					},
				};

				const authField = getMainAuthField(nodeType);
				const authType = getAuthTypeForNodeCredential(nodeType, credentialConfig);
				if (authField && authType) {
					node.parameters[authField.name] = authType.value;
				}

				break;
			}
		}
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
		try {
			// Apply default credentials to incoming nodes BEFORE adding to store
			setDefaultCredentialsOnNodes(workflowData.nodes ?? []);

			const { nodesToUpdate, nodesToAdd, nodesToRemove } = categorizeNodes(workflowData);

			await updateExistingNodes(nodesToUpdate);
			removeStaleNodes(nodesToRemove);
			const addedNodes = await addNewNodes(nodesToAdd);
			const newNodeIds = addedNodes.map((n) => n.id);
			await updateConnections(workflowData.connections ?? {});
			updateWorkflowNameIfNeeded(workflowData.name, options?.isInitialGeneration);

			builderStore.setBuilderMadeEdits(true);

			// Combine newly added node IDs with any additional IDs from previous messages
			const allNodeIdsToTidyUp = [...newNodeIds, ...(options?.nodeIdsToTidyUp ?? [])];
			tidyUpNewNodes(allNodeIdsToTidyUp);

			return { success: true, newNodeIds };
		} catch (error) {
			return { success: false, error };
		}
	}

	return { updateWorkflow };
}
