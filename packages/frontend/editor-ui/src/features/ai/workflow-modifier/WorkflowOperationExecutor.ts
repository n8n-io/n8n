import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowState } from '@/composables/useWorkflowState';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type {
	WorkflowOperation,
	OperationResult,
	AddNodeOperation,
	RemoveNodeOperation,
	UpdateNodeOperation,
	AddConnectionOperation,
	RemoveConnectionOperation,
	UpdateWorkflowSettingsOperation,
	ClearWorkflowOperation,
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowOperationExecutor {
	private workflowsStore = useWorkflowsStore();
	private nodeTypesStore = useNodeTypesStore();
	private workflowState = useWorkflowState();

	async executeOperation(operation: WorkflowOperation): Promise<OperationResult> {
		try {
			switch (operation.type) {
				case 'addNode':
					return await this.executeAddNode(operation);
				case 'removeNode':
					return await this.executeRemoveNode(operation);
				case 'updateNode':
					return await this.executeUpdateNode(operation);
				case 'addConnection':
					return await this.executeAddConnection(operation);
				case 'removeConnection':
					return await this.executeRemoveConnection(operation);
				case 'updateWorkflowSettings':
					return await this.executeUpdateWorkflowSettings(operation);
				case 'clearWorkflow':
					return await this.executeClearWorkflow(operation);
				default:
					return {
						success: false,
						operation,
						error: `Unknown operation type: ${(operation as any).type}`,
					};
			}
		} catch (error) {
			return {
				success: false,
				operation,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async executeAddNode(operation: AddNodeOperation): Promise<OperationResult> {
		// Validate node type exists
		const nodeType = this.nodeTypesStore.getNodeType(operation.nodeType);
		if (!nodeType) {
			return {
				success: false,
				operation,
				error: `Node type '${operation.nodeType}' not found`,
			};
		}

		// Create node data
		const nodeData: INodeUi = {
			id: uuidv4(),
			name: operation.nodeName,
			type: operation.nodeType,
			typeVersion: nodeType.version,
			position: operation.position,
			parameters: operation.parameters || {},
			credentials: operation.credentials,
		};

		// Add node to workflow
		this.workflowsStore.addNode(nodeData);

		return {
			success: true,
			operation,
			message: `Added ${operation.nodeType} node '${operation.nodeName}' at position ${operation.position[0]},${operation.position[1]}`,
		};
	}

	private async executeRemoveNode(operation: RemoveNodeOperation): Promise<OperationResult> {
		// Find node by name
		const node = this.workflowsStore.getNodeByName(operation.nodeName);
		if (!node) {
			return {
				success: false,
				operation,
				error: `Node '${operation.nodeName}' not found`,
			};
		}

		// Remove node
		this.workflowsStore.removeNode(node);

		return {
			success: true,
			operation,
			message: `Removed node '${operation.nodeName}'`,
		};
	}

	private async executeUpdateNode(operation: UpdateNodeOperation): Promise<OperationResult> {
		// Find node by name
		const node = this.workflowsStore.getNodeByName(operation.nodeName);
		if (!node) {
			return {
				success: false,
				operation,
				error: `Node '${operation.nodeName}' not found`,
			};
		}

		const updates: string[] = [];

		// Update parameters
		if (operation.parameters) {
			for (const [key, value] of Object.entries(operation.parameters)) {
				this.workflowState.setNodeValue({
					name: operation.nodeName,
					key,
					value,
				});
				updates.push(`${key} = ${JSON.stringify(value)}`);
			}
		}

		// Update position
		if (operation.position) {
			this.workflowState.updateNodeProperties({
				name: operation.nodeName,
				properties: {
					position: operation.position,
				},
			});
			updates.push(`position = [${operation.position.join(', ')}]`);
		}

		// Rename node
		if (operation.name) {
			this.workflowState.updateNodeProperties({
				name: operation.nodeName,
				properties: {
					name: operation.name,
				},
			});
			updates.push(`name = '${operation.name}'`);
		}

		return {
			success: true,
			operation,
			message: `Updated node '${operation.nodeName}': ${updates.join(', ')}`,
		};
	}

	private async executeAddConnection(
		operation: AddConnectionOperation,
	): Promise<OperationResult> {
		// Validate source and target nodes exist
		const sourceNode = this.workflowsStore.getNodeByName(operation.sourceNode);
		if (!sourceNode) {
			return {
				success: false,
				operation,
				error: `Source node '${operation.sourceNode}' not found`,
			};
		}

		const targetNode = this.workflowsStore.getNodeByName(operation.targetNode);
		if (!targetNode) {
			return {
				success: false,
				operation,
				error: `Target node '${operation.targetNode}' not found`,
			};
		}

		const connectionType = operation.connectionType || 'main';

		// Get current connections
		const connections = { ...this.workflowsStore.workflow.connections };

		// Initialize source node connections if not exists
		if (!connections[operation.sourceNode]) {
			connections[operation.sourceNode] = {};
		}
		if (!connections[operation.sourceNode][connectionType]) {
			connections[operation.sourceNode][connectionType] = [];
		}

		// Add connection
		const sourceConnections = connections[operation.sourceNode][connectionType];
		if (!sourceConnections[operation.sourceOutputIndex]) {
			sourceConnections[operation.sourceOutputIndex] = [];
		}

		sourceConnections[operation.sourceOutputIndex].push({
			node: operation.targetNode,
			type: connectionType,
			index: operation.targetInputIndex,
		});

		// Update workflow connections
		this.workflowsStore.setConnections(connections);

		return {
			success: true,
			operation,
			message: `Connected ${operation.sourceNode} to ${operation.targetNode}`,
		};
	}

	private async executeRemoveConnection(
		operation: RemoveConnectionOperation,
	): Promise<OperationResult> {
		const connections = { ...this.workflowsStore.workflow.connections };
		const connectionType = 'main';

		if (
			!connections[operation.sourceNode] ||
			!connections[operation.sourceNode][connectionType] ||
			!connections[operation.sourceNode][connectionType][operation.sourceOutputIndex]
		) {
			return {
				success: false,
				operation,
				error: `Connection not found from ${operation.sourceNode} output ${operation.sourceOutputIndex}`,
			};
		}

		// Remove the specific connection
		const sourceConnections =
			connections[operation.sourceNode][connectionType][operation.sourceOutputIndex];
		const filteredConnections = sourceConnections.filter(
			(conn) => !(conn.node === operation.targetNode && conn.index === operation.targetInputIndex),
		);

		connections[operation.sourceNode][connectionType][operation.sourceOutputIndex] =
			filteredConnections;

		// Update workflow connections
		this.workflowsStore.setConnections(connections);

		return {
			success: true,
			operation,
			message: `Disconnected ${operation.sourceNode} from ${operation.targetNode}`,
		};
	}

	private async executeUpdateWorkflowSettings(
		operation: UpdateWorkflowSettingsOperation,
	): Promise<OperationResult> {
		const updates: string[] = [];

		if (operation.name) {
			this.workflowState.setWorkflowName(operation.name);
			updates.push(`name = '${operation.name}'`);
		}

		if (operation.tags) {
			this.workflowState.setWorkflowTagIds(operation.tags);
			updates.push(`tags = [${operation.tags.join(', ')}]`);
		}

		if (operation.settings) {
			this.workflowState.setWorkflowSettings(operation.settings);
			updates.push('settings updated');
		}

		return {
			success: true,
			operation,
			message: `Updated workflow: ${updates.join(', ')}`,
		};
	}

	private async executeClearWorkflow(
		operation: ClearWorkflowOperation,
	): Promise<OperationResult> {
		// Get all nodes
		const allNodes = [...this.workflowsStore.allNodes];

		// Remove all nodes
		for (const node of allNodes) {
			this.workflowsStore.removeNode(node);
		}

		// Clear connections
		this.workflowsStore.setConnections({});

		return {
			success: true,
			operation,
			message: 'Workflow cleared',
		};
	}
}
