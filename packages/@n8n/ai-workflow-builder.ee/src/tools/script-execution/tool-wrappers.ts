/**
 * Tool wrappers for script execution.
 *
 * These wrappers adapt existing builder tools to work within the script
 * execution context. Instead of returning Command objects, they:
 * 1. Execute the tool logic directly
 * 2. Accumulate operations in the OperationsCollector
 * 3. Return simplified result objects
 */

import type { Logger } from '@n8n/backend-common';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { findNodeType } from '@/tools/helpers/validation';
import { inferConnectionType, validateConnection } from '@/tools/utils/connection.utils';
import { generateUniqueName, createNodeInstance } from '@/tools/utils/node-creation.utils';
import { calculateNodePosition } from '@/tools/utils/node-positioning.utils';
import type { SimpleWorkflow, WorkflowOperation } from '@/types/workflow';
import { isSubNode } from '@/utils/node-helpers';
import { validateConnections, validateTrigger } from '@/validation/checks';

import { ScriptToolError } from './errors';
import type { OperationsCollector } from './state-provider';
import {
	resolveNodeId,
	type AddNodeInput,
	type AddNodeResult,
	type ConnectNodesInput,
	type ConnectNodesResult,
	type RemoveNodeInput,
	type RemoveNodeResult,
	type RemoveConnectionInput,
	type RemoveConnectionResult,
	type RenameNodeInput,
	type RenameNodeResult,
	type ValidateStructureResult,
	type ScriptTools,
} from './tool-interfaces';

/**
 * Configuration for creating script tool wrappers
 */
export interface ToolWrappersConfig {
	nodeTypes: INodeTypeDescription[];
	workflow: SimpleWorkflow;
	operationsCollector: OperationsCollector;
	logger?: Logger;
}

/**
 * Helper to get current workflow state including pending operations
 */
function getCurrentWorkflowNodes(
	originalWorkflow: SimpleWorkflow,
	collector: OperationsCollector,
): INode[] {
	// Start with original nodes
	let nodes = [...originalWorkflow.nodes];

	// Apply pending operations
	for (const op of collector.getOperations()) {
		if (op.type === 'addNodes') {
			nodes = [...nodes, ...op.nodes];
		} else if (op.type === 'removeNode') {
			nodes = nodes.filter((n) => !op.nodeIds.includes(n.id));
		} else if (op.type === 'updateNode') {
			nodes = nodes.map((n) => (n.id === op.nodeId ? { ...n, ...op.updates } : n));
		} else if (op.type === 'renameNode') {
			nodes = nodes.map((n) => (n.id === op.nodeId ? { ...n, name: op.newName } : n));
		}
	}

	return nodes;
}

/**
 * Helper to get current connections including pending operations
 */
function getCurrentConnections(
	originalWorkflow: SimpleWorkflow,
	collector: OperationsCollector,
): SimpleWorkflow['connections'] {
	let connections = { ...originalWorkflow.connections };

	for (const op of collector.getOperations()) {
		if (op.type === 'setConnections') {
			connections = op.connections;
		} else if (op.type === 'mergeConnections') {
			connections = mergeConnections(connections, op.connections);
		} else if (op.type === 'removeConnection') {
			connections = removeConnectionFromMap(
				connections,
				op.sourceNode,
				op.targetNode,
				op.connectionType,
				op.sourceOutputIndex,
				op.targetInputIndex,
			);
		} else if (op.type === 'renameNode') {
			connections = renameNodeInConnections(connections, op.oldName, op.newName);
		} else if (op.type === 'removeNode') {
			// Remove connections for removed nodes
			for (const nodeId of op.nodeIds) {
				// Find node name
				const node = originalWorkflow.nodes.find((n) => n.id === nodeId);
				if (node) {
					connections = removeNodeConnections(connections, node.name);
				}
			}
		}
	}

	return connections;
}

/**
 * Merge two connection maps
 */
function mergeConnections(
	existing: SimpleWorkflow['connections'],
	newConnections: SimpleWorkflow['connections'],
): SimpleWorkflow['connections'] {
	const result = { ...existing };

	for (const [sourceName, sourceConns] of Object.entries(newConnections)) {
		if (!result[sourceName]) {
			result[sourceName] = {};
		}

		for (const [connType, outputs] of Object.entries(sourceConns)) {
			result[sourceName][connType] ??= [];

			// Merge outputs
			if (Array.isArray(outputs)) {
				outputs.forEach((outputConns, outputIdx) => {
					result[sourceName][connType][outputIdx] ??= [];
					if (Array.isArray(outputConns)) {
						result[sourceName][connType][outputIdx] = [
							...result[sourceName][connType][outputIdx],
							...outputConns,
						];
					}
				});
			}
		}
	}

	return result;
}

/**
 * Remove a connection from the connections map
 */
function removeConnectionFromMap(
	connections: SimpleWorkflow['connections'],
	sourceNode: string,
	targetNode: string,
	connectionType: string,
	sourceOutputIndex: number,
	targetInputIndex: number,
): SimpleWorkflow['connections'] {
	const result = { ...connections };

	if (result[sourceNode]?.[connectionType]?.[sourceOutputIndex]) {
		result[sourceNode][connectionType][sourceOutputIndex] = result[sourceNode][connectionType][
			sourceOutputIndex
		].filter((conn) => !(conn.node === targetNode && conn.index === targetInputIndex));
	}

	return result;
}

/**
 * Rename a node in connections
 */
function renameNodeInConnections(
	connections: SimpleWorkflow['connections'],
	oldName: string,
	newName: string,
): SimpleWorkflow['connections'] {
	const result: SimpleWorkflow['connections'] = {};

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		const newSourceName = sourceName === oldName ? newName : sourceName;
		result[newSourceName] = {};

		for (const [connType, outputs] of Object.entries(sourceConns)) {
			result[newSourceName][connType] = [];

			if (Array.isArray(outputs)) {
				outputs.forEach((outputConns, idx) => {
					result[newSourceName][connType][idx] = [];
					if (Array.isArray(outputConns)) {
						result[newSourceName][connType][idx] = outputConns.map((conn) => ({
							...conn,
							node: conn.node === oldName ? newName : conn.node,
						}));
					}
				});
			}
		}
	}

	return result;
}

/**
 * Remove all connections for a node
 */
function removeNodeConnections(
	connections: SimpleWorkflow['connections'],
	nodeName: string,
): SimpleWorkflow['connections'] {
	const result: SimpleWorkflow['connections'] = {};

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		// Skip if this is the removed node
		if (sourceName === nodeName) continue;

		result[sourceName] = {};
		for (const [connType, outputs] of Object.entries(sourceConns)) {
			result[sourceName][connType] = [];

			if (Array.isArray(outputs)) {
				outputs.forEach((outputConns, idx) => {
					result[sourceName][connType][idx] = [];
					if (Array.isArray(outputConns)) {
						// Filter out connections to the removed node
						result[sourceName][connType][idx] = outputConns.filter(
							(conn) => conn.node !== nodeName,
						);
					}
				});
			}
		}
	}

	return result;
}

/**
 * Helper to find nodes and their type descriptions for connection
 */
interface NodeLookupResult {
	sourceNode?: INode;
	targetNode?: INode;
	sourceNodeType?: INodeTypeDescription;
	targetNodeType?: INodeTypeDescription;
	error?: string;
}

function lookupNodesForConnection(
	sourceNodeId: string,
	targetNodeId: string,
	currentNodes: INode[],
	nodeTypes: INodeTypeDescription[],
): NodeLookupResult {
	const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
	const targetNode = currentNodes.find((n) => n.id === targetNodeId);

	if (!sourceNode || !targetNode) {
		const missing = !sourceNode ? sourceNodeId : targetNodeId;
		return { error: `Node with ID "${missing}" not found` };
	}

	const sourceNodeType = nodeTypes.find((nt) => nt.name === sourceNode.type);
	const targetNodeType = nodeTypes.find((nt) => nt.name === targetNode.type);

	if (!sourceNodeType || !targetNodeType) {
		const missing = !sourceNodeType ? sourceNode.type : targetNode.type;
		return { error: `Node type "${missing}" not found` };
	}

	return { sourceNode, targetNode, sourceNodeType, targetNodeType };
}

/**
 * Create tool wrappers for use in script execution
 */
export function createToolWrappers(config: ToolWrappersConfig): ScriptTools {
	const { nodeTypes, workflow, operationsCollector, logger } = config;

	/**
	 * Add a node to the workflow
	 */
	async function addNode(input: AddNodeInput): Promise<AddNodeResult> {
		try {
			const { nodeType, nodeVersion, name, initialParameters } = input;

			// Find the node type
			const nodeTypeDesc = findNodeType(nodeType, nodeVersion, nodeTypes);
			if (!nodeTypeDesc) {
				return {
					success: false,
					error: `Node type "${nodeType}" version ${nodeVersion} not found`,
				};
			}

			// Get current nodes including pending additions
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);

			// Generate unique name
			const baseName = name ?? nodeTypeDesc.defaults?.name ?? nodeTypeDesc.displayName;
			const uniqueName = generateUniqueName(baseName, currentNodes);

			// Calculate position
			const position = calculateNodePosition(currentNodes, isSubNode(nodeTypeDesc), nodeTypes);

			// Create the node instance
			const newNode = createNodeInstance(
				nodeTypeDesc,
				nodeVersion,
				uniqueName,
				position,
				initialParameters,
			);

			// Add operation to collector
			const operation: WorkflowOperation = { type: 'addNodes', nodes: [newNode] };
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Added node "${uniqueName}" (${nodeType})`);

			return {
				success: true,
				nodeId: newNode.id,
				nodeName: newNode.name,
				nodeType: newNode.type,
				displayName: nodeTypeDesc.displayName,
				position: newNode.position,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error adding node';
			throw new ScriptToolError('addNode', message, { toolInput: input });
		}
	}

	/**
	 * Connect two nodes
	 */
	async function connectNodes(input: ConnectNodesInput): Promise<ConnectNodesResult> {
		try {
			const { sourceOutputIndex = 0, targetInputIndex = 0 } = input;

			// Resolve node references to IDs (supports both string and AddNodeResult objects)
			const sourceNodeId = resolveNodeId(input.sourceNodeId);
			const targetNodeId = resolveNodeId(input.targetNodeId);

			logger?.debug('connectNodes input:', {
				sourceInput: input.sourceNodeId,
				targetInput: input.targetNodeId,
				sourceNodeId,
				targetNodeId,
			});

			if (!sourceNodeId) {
				return {
					success: false,
					error: `Invalid source node reference - nodeId not found. Received: ${JSON.stringify(input.sourceNodeId)}`,
				};
			}
			if (!targetNodeId) {
				return {
					success: false,
					error: `Invalid target node reference - nodeId not found. Received: ${JSON.stringify(input.targetNodeId)}`,
				};
			}

			// Get current nodes and lookup nodes for connection
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const lookup = lookupNodesForConnection(sourceNodeId, targetNodeId, currentNodes, nodeTypes);

			if (lookup.error) {
				return { success: false, error: lookup.error };
			}

			let { sourceNode, targetNode } = lookup;
			const { sourceNodeType, targetNodeType } = lookup;

			// Infer connection type
			const inferResult = inferConnectionType(
				sourceNode!,
				targetNode!,
				sourceNodeType!,
				targetNodeType!,
			);

			if (inferResult.error || !inferResult.connectionType) {
				return { success: false, error: inferResult.error ?? 'Could not infer connection type' };
			}

			const connectionType = inferResult.connectionType;

			// Handle node swap if required
			if (inferResult.requiresSwap) {
				[sourceNode, targetNode] = [targetNode, sourceNode];
			}

			// Validate connection
			const validation = validateConnection(sourceNode!, targetNode!, connectionType, nodeTypes);

			if (!validation.valid) {
				return { success: false, error: validation.error ?? 'Invalid connection' };
			}

			// Use potentially swapped nodes
			const actualSource = validation.swappedSource ?? sourceNode!;
			const actualTarget = validation.swappedTarget ?? targetNode!;
			const swapped = inferResult.requiresSwap === true || validation.shouldSwap === true;

			// Create the connection
			const newConnection: SimpleWorkflow['connections'] = {
				[actualSource.name]: {
					[connectionType]: Array(sourceOutputIndex + 1)
						.fill(null)
						.map((_, i) =>
							i === sourceOutputIndex
								? [{ node: actualTarget.name, type: connectionType, index: targetInputIndex }]
								: [],
						),
				},
			};

			// Add operation to collector
			const operation: WorkflowOperation = { type: 'mergeConnections', connections: newConnection };
			operationsCollector.addOperation(operation);

			logger?.debug(
				`Script: Connected "${actualSource.name}" -> "${actualTarget.name}" (${connectionType})`,
			);

			return {
				success: true,
				sourceNode: actualSource.name,
				targetNode: actualTarget.name,
				connectionType,
				swapped,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error connecting nodes';
			throw new ScriptToolError('connectNodes', message, { toolInput: input });
		}
	}

	/**
	 * Remove a node from the workflow
	 */
	async function removeNode(input: RemoveNodeInput): Promise<RemoveNodeResult> {
		try {
			const { nodeId } = input;

			// Get current nodes
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const nodeToRemove = currentNodes.find((n) => n.id === nodeId);

			if (!nodeToRemove) {
				return {
					success: false,
					error: `Node with ID "${nodeId}" not found`,
				};
			}

			// Get current connections to count removals
			const currentConnections = getCurrentConnections(workflow, operationsCollector);
			let connectionsRemoved = 0;

			// Count outgoing connections
			if (currentConnections[nodeToRemove.name]) {
				for (const outputs of Object.values(currentConnections[nodeToRemove.name])) {
					if (Array.isArray(outputs)) {
						for (const outputConns of outputs) {
							if (Array.isArray(outputConns)) {
								connectionsRemoved += outputConns.length;
							}
						}
					}
				}
			}

			// Count incoming connections
			for (const sourceConns of Object.values(currentConnections)) {
				for (const outputs of Object.values(sourceConns)) {
					if (Array.isArray(outputs)) {
						for (const outputConns of outputs) {
							if (Array.isArray(outputConns)) {
								connectionsRemoved += outputConns.filter(
									(c) => c.node === nodeToRemove.name,
								).length;
							}
						}
					}
				}
			}

			// Add operation to collector
			const operation: WorkflowOperation = { type: 'removeNode', nodeIds: [nodeId] };
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Removed node "${nodeToRemove.name}"`);

			return {
				success: true,
				removedNodeId: nodeId,
				removedNodeName: nodeToRemove.name,
				removedNodeType: nodeToRemove.type,
				connectionsRemoved,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error removing node';
			throw new ScriptToolError('removeNode', message, { toolInput: input });
		}
	}

	/**
	 * Remove a connection between nodes
	 */
	async function removeConnection(input: RemoveConnectionInput): Promise<RemoveConnectionResult> {
		try {
			const { sourceOutputIndex = 0, targetInputIndex = 0 } = input;

			// Resolve node references to find the actual nodes
			const sourceRef = resolveNodeId(input.sourceNodeId);
			const targetRef = resolveNodeId(input.targetNodeId);

			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);

			// Find source node - try by ID first, then by name
			let sourceNode = sourceRef ? currentNodes.find((n) => n.id === sourceRef) : undefined;
			if (!sourceNode && sourceRef) {
				sourceNode = currentNodes.find((n) => n.name === sourceRef);
			}

			// Find target node - try by ID first, then by name
			let targetNode = sourceRef ? currentNodes.find((n) => n.id === targetRef) : undefined;
			if (!targetNode && targetRef) {
				targetNode = currentNodes.find((n) => n.name === targetRef);
			}

			if (!sourceNode) {
				return {
					success: false,
					error: `Source node not found. Received: ${JSON.stringify(input.sourceNodeId)}`,
				};
			}
			if (!targetNode) {
				return {
					success: false,
					error: `Target node not found. Received: ${JSON.stringify(input.targetNodeId)}`,
				};
			}

			// Determine connection type - use provided or default to 'main'
			const connectionType = input.connectionType ?? 'main';

			// Add operation to collector (uses node names, not IDs)
			const operation: WorkflowOperation = {
				type: 'removeConnection',
				sourceNode: sourceNode.name,
				targetNode: targetNode.name,
				connectionType,
				sourceOutputIndex,
				targetInputIndex,
			};
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Removed connection "${sourceNode.name}" -> "${targetNode.name}"`);

			return {
				success: true,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error removing connection';
			throw new ScriptToolError('removeConnection', message, { toolInput: input });
		}
	}

	/**
	 * Rename a node
	 */
	async function renameNode(input: RenameNodeInput): Promise<RenameNodeResult> {
		try {
			const { nodeId, newName } = input;

			// Get current nodes
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const nodeToRename = currentNodes.find((n) => n.id === nodeId);

			if (!nodeToRename) {
				return {
					success: false,
					error: `Node with ID "${nodeId}" not found`,
				};
			}

			// Check if new name already exists
			const nameExists = currentNodes.some((n) => n.name === newName && n.id !== nodeId);
			if (nameExists) {
				return {
					success: false,
					error: `A node with name "${newName}" already exists`,
				};
			}

			const oldName = nodeToRename.name;

			// Add operation to collector
			const operation: WorkflowOperation = { type: 'renameNode', nodeId, oldName, newName };
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Renamed node "${oldName}" -> "${newName}"`);

			return {
				success: true,
				oldName,
				newName,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error renaming node';
			throw new ScriptToolError('renameNode', message, { toolInput: input });
		}
	}

	/**
	 * Validate workflow structure
	 */
	async function validateStructure(): Promise<ValidateStructureResult> {
		try {
			// Build current workflow state
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const currentConnections = getCurrentConnections(workflow, operationsCollector);

			const currentWorkflow: SimpleWorkflow = {
				name: workflow.name,
				nodes: currentNodes,
				connections: currentConnections,
			};

			// Run validations
			const connectionViolations = validateConnections(currentWorkflow, nodeTypes);
			const triggerViolations = validateTrigger(currentWorkflow, nodeTypes);
			const allViolations = [...connectionViolations, ...triggerViolations];

			const isValid = allViolations.length === 0;
			const issues = allViolations.map((v) => v.description);

			logger?.debug(
				`Script: Validated structure - ${isValid ? 'valid' : `${issues.length} issues`}`,
			);

			return {
				success: true,
				isValid,
				issues: isValid ? undefined : issues,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error validating structure';
			return {
				success: false,
				isValid: false,
				error: message,
			};
		}
	}

	return {
		addNode,
		connectNodes,
		removeNode,
		removeConnection,
		renameNode,
		validateStructure,
	};
}
