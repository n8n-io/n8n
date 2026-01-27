/**
 * Tool wrappers for script execution.
 *
 * These wrappers adapt existing builder tools to work within the script
 * execution context. Instead of returning Command objects, they:
 * 1. Execute the tool logic directly
 * 2. Accumulate operations in the OperationsCollector
 * 3. Return simplified result objects
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import get from 'lodash/get';
import type {
	INode,
	INodeParameters,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { createParameterUpdaterChain } from '@/chains/parameter-updater';
import { findNodeType } from '@/tools/helpers/validation';
import { inferConnectionType, validateConnection } from '@/tools/utils/connection.utils';
import { generateUniqueName, createNodeInstance } from '@/tools/utils/node-creation.utils';
import { calculateNodePosition } from '@/tools/utils/node-positioning.utils';
import type { SimpleWorkflow, WorkflowOperation } from '@/types/workflow';
import { isSubNode } from '@/utils/node-helpers';
import {
	validateAgentPrompt,
	validateConnections,
	validateFromAi,
	validateTools,
	validateTrigger,
} from '@/validation/checks';

import { ScriptToolError } from './errors';
import type { OperationsCollector } from './state-provider';
import {
	resolveNodeId,
	normalizeAddNodeInput,
	normalizeConnectNodesInput,
	type AddNodeInput,
	type AddNodeResult,
	type AddNodesInput,
	type AddNodesResult,
	type ConnectNodesInput,
	type ConnectNodesResult,
	type ConnectMultipleInput,
	type ConnectMultipleResult,
	type RemoveNodeInput,
	type RemoveNodeResult,
	type RemoveConnectionInput,
	type RemoveConnectionResult,
	type RenameNodeInput,
	type RenameNodeResult,
	type ValidateStructureResult,
	type UpdateNodeParametersInput,
	type UpdateNodeParametersResult,
	type GetNodeParameterInput,
	type GetNodeParameterResult,
	type ValidateConfigurationResult,
	type SetParametersInput,
	type SetParametersResult,
	type BatchSetParametersInput,
	type BatchSetParametersResult,
	type BatchUpdateParametersInput,
	type BatchUpdateParametersResult,
	type ScriptTools,
} from './tool-interfaces';

/**
 * Workflow context for parameter updates
 */
export interface WorkflowContext {
	executionSchema?: string;
	executionData?: string;
	workflowJson?: string;
}

/**
 * Configuration for creating script tool wrappers
 */
export interface ToolWrappersConfig {
	nodeTypes: INodeTypeDescription[];
	workflow: SimpleWorkflow;
	operationsCollector: OperationsCollector;
	logger?: Logger;
	/** LLM for parameter updates (required for updateNodeParameters) */
	parameterUpdaterLLM?: BaseChatModel;
	/** n8n instance URL for resource locators */
	instanceUrl?: string;
	/** Workflow context for parameter updates */
	workflowContext?: WorkflowContext;
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

/**
 * Find a node by ID first, then fall back to name lookup.
 * This allows scripts to use either UUIDs or node names.
 */
function findNodeByIdOrName(nodes: INode[], idOrName: string): INode | undefined {
	// Try ID first (UUID match)
	let node = nodes.find((n) => n.id === idOrName);
	// Fall back to name match
	node ??= nodes.find((n) => n.name === idOrName);
	return node;
}

function lookupNodesForConnection(
	sourceNodeId: string,
	targetNodeId: string,
	currentNodes: INode[],
	nodeTypes: INodeTypeDescription[],
): NodeLookupResult {
	// Try to find by ID first, then fall back to name lookup
	const sourceNode = findNodeByIdOrName(currentNodes, sourceNodeId);
	const targetNode = findNodeByIdOrName(currentNodes, targetNodeId);

	if (!sourceNode || !targetNode) {
		const missing = !sourceNode ? sourceNodeId : targetNodeId;
		return { error: `Node "${missing}" not found (checked both ID and name)` };
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
 * Result from validating and resolving a connection
 */
interface ResolvedConnection {
	success: true;
	sourceNode: INode;
	targetNode: INode;
	connectionType: string;
	swapped: boolean;
}

interface ResolvedConnectionError {
	success: false;
	error: string;
}

type ResolveConnectionResult = ResolvedConnection | ResolvedConnectionError;

/**
 * Validates and resolves a single connection, handling node lookup, inference, and validation.
 * Extracted to reduce complexity in connectNodes and connectMultiple.
 */
function resolveAndValidateConnection(
	sourceNodeId: string,
	targetNodeId: string,
	currentNodes: INode[],
	nodeTypes: INodeTypeDescription[],
	logger?: Logger,
): ResolveConnectionResult {
	// Lookup nodes
	const lookup = lookupNodesForConnection(sourceNodeId, targetNodeId, currentNodes, nodeTypes);

	if (lookup.error) {
		return { success: false, error: lookup.error };
	}

	let { sourceNode, targetNode } = lookup;
	const { sourceNodeType, targetNodeType } = lookup;

	// Debug logging for connection inference
	logger?.debug('Script: resolveConnection - inferring connection type', {
		sourceNodeName: sourceNode!.name,
		sourceNodeType: sourceNode!.type,
		targetNodeName: targetNode!.name,
		targetNodeType: targetNode!.type,
		targetNodeParameters: targetNode!.parameters,
		targetHasOutputParser: targetNode!.parameters?.hasOutputParser,
	});

	// Infer connection type
	const inferResult = inferConnectionType(
		sourceNode!,
		targetNode!,
		sourceNodeType!,
		targetNodeType!,
	);

	if (inferResult.error || !inferResult.connectionType) {
		logger?.debug('Script: resolveConnection - inference failed', {
			error: inferResult.error,
			possibleTypes: inferResult.possibleTypes,
		});
		return { success: false, error: inferResult.error ?? 'Could not infer connection type' };
	}

	const connectionType = inferResult.connectionType;

	// Handle node swap if required by inference
	if (inferResult.requiresSwap) {
		[sourceNode, targetNode] = [targetNode, sourceNode];
	}

	// Validate connection
	const validation = validateConnection(sourceNode!, targetNode!, connectionType, nodeTypes);

	if (!validation.valid) {
		return { success: false, error: validation.error ?? 'Invalid connection' };
	}

	// Use potentially swapped nodes from validation
	const actualSource = validation.swappedSource ?? sourceNode!;
	const actualTarget = validation.swappedTarget ?? targetNode!;
	const swapped = inferResult.requiresSwap === true || validation.shouldSwap === true;

	return {
		success: true,
		sourceNode: actualSource,
		targetNode: actualTarget,
		connectionType,
		swapped,
	};
}

/**
 * Build connection structure for a single connection
 */
function buildConnectionStructure(
	sourceName: string,
	targetName: string,
	connectionType: string,
	sourceOutputIndex: number,
	targetInputIndex: number,
): SimpleWorkflow['connections'] {
	return {
		[sourceName]: {
			[connectionType]: Array(sourceOutputIndex + 1)
				.fill(null)
				.map((_, i) =>
					i === sourceOutputIndex
						? [
								{
									node: targetName,
									type: connectionType as NodeConnectionType,
									index: targetInputIndex,
								},
							]
						: [],
				),
		},
	};
}

/**
 * Create tool wrappers for use in script execution
 */
export function createToolWrappers(config: ToolWrappersConfig): ScriptTools {
	const {
		nodeTypes,
		workflow,
		operationsCollector,
		logger,
		parameterUpdaterLLM,
		instanceUrl,
		workflowContext,
	} = config;

	/**
	 * Find the latest version of a node type
	 */
	function findLatestNodeVersion(nodeType: string): number | undefined {
		const matchingTypes = nodeTypes.filter((nt) => nt.name === nodeType);
		if (matchingTypes.length === 0) return undefined;

		// Find max version
		let maxVersion = 1;
		for (const nt of matchingTypes) {
			const version = nt.version;
			if (typeof version === 'number' && version > maxVersion) {
				maxVersion = version;
			} else if (Array.isArray(version)) {
				const arrMax = Math.max(...version);
				if (arrMax > maxVersion) maxVersion = arrMax;
			}
		}
		return maxVersion;
	}

	/**
	 * Add a node to the workflow
	 */
	async function addNode(input: AddNodeInput): Promise<AddNodeResult> {
		try {
			// Normalize short-form input to full form
			const normalized = normalizeAddNodeInput(input);
			const { nodeType, name, initialParameters = {} } = normalized;

			// Default version to latest if not specified
			let nodeVersion = normalized.nodeVersion;
			if (nodeVersion === undefined) {
				nodeVersion = findLatestNodeVersion(nodeType);
				if (nodeVersion === undefined) {
					return {
						success: false,
						error: `Node type "${nodeType}" not found`,
					};
				}
			}

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
			// Normalize short-form input
			const normalized = normalizeConnectNodesInput(input);
			const { sourceOutputIndex = 0, targetInputIndex = 0 } = normalized;

			// Resolve node references to IDs (supports both string and AddNodeResult objects)
			const sourceNodeId = resolveNodeId(normalized.sourceNodeId);
			const targetNodeId = resolveNodeId(normalized.targetNodeId);

			if (!sourceNodeId) {
				return {
					success: false,
					error: `Invalid source node reference - nodeId not found. Received: ${JSON.stringify(normalized.sourceNodeId)}`,
				};
			}
			if (!targetNodeId) {
				return {
					success: false,
					error: `Invalid target node reference - nodeId not found. Received: ${JSON.stringify(normalized.targetNodeId)}`,
				};
			}

			// Get current nodes and resolve connection
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const resolved = resolveAndValidateConnection(
				sourceNodeId,
				targetNodeId,
				currentNodes,
				nodeTypes,
				logger,
			);

			if (!resolved.success) {
				return { success: false, error: resolved.error };
			}

			// Build and add the connection
			const newConnection = buildConnectionStructure(
				resolved.sourceNode.name,
				resolved.targetNode.name,
				resolved.connectionType,
				sourceOutputIndex,
				targetInputIndex,
			);

			const operation: WorkflowOperation = { type: 'mergeConnections', connections: newConnection };
			operationsCollector.addOperation(operation);

			logger?.debug(
				`Script: Connected "${resolved.sourceNode.name}" -> "${resolved.targetNode.name}" (${resolved.connectionType})`,
			);

			return {
				success: true,
				sourceNode: resolved.sourceNode.name,
				targetNode: resolved.targetNode.name,
				connectionType: resolved.connectionType,
				swapped: resolved.swapped,
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
			// Support both ID and name lookup for flexibility
			const nodeToRemove = findNodeByIdOrName(currentNodes, nodeId);

			if (!nodeToRemove) {
				return {
					success: false,
					error: `Node "${nodeId}" not found (checked both ID and name)`,
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

			// Use the actual node ID (UUID), not the input which might have been a name
			const actualNodeId = nodeToRemove.id;

			// Add operation to collector
			const operation: WorkflowOperation = { type: 'removeNode', nodeIds: [actualNodeId] };
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Removed node "${nodeToRemove.name}"`);

			return {
				success: true,
				removedNodeId: actualNodeId,
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

			if (!sourceRef) {
				return {
					success: false,
					error: `Invalid source node reference. Received: ${JSON.stringify(input.sourceNodeId)}`,
				};
			}
			if (!targetRef) {
				return {
					success: false,
					error: `Invalid target node reference. Received: ${JSON.stringify(input.targetNodeId)}`,
				};
			}

			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);

			// Support both ID and name lookup for flexibility
			const sourceNode = findNodeByIdOrName(currentNodes, sourceRef);
			const targetNode = findNodeByIdOrName(currentNodes, targetRef);

			if (!sourceNode) {
				return {
					success: false,
					error: `Source node "${sourceRef}" not found (checked both ID and name)`,
				};
			}
			if (!targetNode) {
				return {
					success: false,
					error: `Target node "${targetRef}" not found (checked both ID and name)`,
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
			// Support both ID and name lookup for flexibility
			const nodeToRename = findNodeByIdOrName(currentNodes, nodeId);

			if (!nodeToRename) {
				return {
					success: false,
					error: `Node "${nodeId}" not found (checked both ID and name)`,
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
			// Use the actual node ID (UUID), not the input which might have been a name
			const actualNodeId = nodeToRename.id;

			// Add operation to collector
			const operation: WorkflowOperation = {
				type: 'renameNode',
				nodeId: actualNodeId,
				oldName,
				newName,
			};
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

	/**
	 * Update node parameters using natural language instructions
	 */
	async function updateNodeParameters(
		input: UpdateNodeParametersInput,
	): Promise<UpdateNodeParametersResult> {
		try {
			const { nodeId, changes } = input;

			// Check if LLM is available - throw so scripts know this failed
			if (!parameterUpdaterLLM) {
				throw new ScriptToolError(
					'updateNodeParameters',
					'Parameter update requires LLM configuration. Use initialParameters when creating nodes instead, or ensure parameterUpdaterLLM is configured.',
					{ toolInput: input },
				);
			}

			// Get current nodes
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			// Support both ID and name lookup for flexibility
			const nodeToUpdate = findNodeByIdOrName(currentNodes, nodeId);

			if (!nodeToUpdate) {
				return {
					success: false,
					error: `Node "${nodeId}" not found (checked both ID and name)`,
				};
			}

			// Find the node type definition
			const nodeTypeDesc = nodeTypes.find((nt) => nt.name === nodeToUpdate.type);
			if (!nodeTypeDesc) {
				return {
					success: false,
					error: `Node type "${nodeToUpdate.type}" not found`,
				};
			}

			// Build current workflow for context
			const currentConnections = getCurrentConnections(workflow, operationsCollector);
			const currentWorkflow: SimpleWorkflow = {
				name: workflow.name,
				nodes: currentNodes,
				connections: currentConnections,
			};

			// Create the parameter updater chain
			const chain = createParameterUpdaterChain(
				parameterUpdaterLLM,
				{
					nodeType: nodeToUpdate.type,
					nodeDefinition: nodeTypeDesc,
					requestedChanges: changes,
				},
				logger,
			);

			// Invoke the chain
			const result = await chain.invoke({
				node_definition: JSON.stringify(nodeTypeDesc.properties, null, 2),
				workflow_json: JSON.stringify(currentWorkflow, null, 2),
				execution_data: workflowContext?.executionData ?? 'No execution data available',
				execution_schema: workflowContext?.executionSchema ?? 'No execution schema available',
				node_name: nodeToUpdate.name,
				node_type: nodeToUpdate.type,
				current_parameters: JSON.stringify(nodeToUpdate.parameters ?? {}, null, 2),
				changes: changes.join('\n'),
				instanceUrl: instanceUrl ?? '',
			});

			// Merge with existing parameters to preserve defaults/values the LLM might have omitted
			// LLM-returned values win, but omitted values are preserved from existing
			const llmParameters = result.parameters as INodeParameters;
			const existingParameters = nodeToUpdate.parameters ?? {};
			const updatedParameters = { ...existingParameters, ...llmParameters };

			logger?.debug('Script: Parameter update result', {
				nodeName: nodeToUpdate.name,
				nodeId,
				requestedChanges: changes,
				previousParameters: existingParameters,
				llmParameters,
				finalMergedParameters: updatedParameters,
			});

			// Validate that we got meaningful parameters back from the LLM
			if (!llmParameters || Object.keys(llmParameters).length === 0) {
				logger?.warn('Script: LLM returned empty parameters - preserving existing values');
			}

			// Use the actual node ID (UUID), not the input which might have been a name
			const actualNodeId = nodeToUpdate.id;

			// Add operation to collector
			const operation: WorkflowOperation = {
				type: 'updateNode',
				nodeId: actualNodeId,
				updates: { parameters: updatedParameters },
			};
			operationsCollector.addOperation(operation);

			logger?.debug(
				`Script: Updated parameters for node "${nodeToUpdate.name}" (op #${operationsCollector.count})`,
			);

			return {
				success: true,
				updatedParameters,
				appliedChanges: changes,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error updating node parameters';
			throw new ScriptToolError('updateNodeParameters', message, { toolInput: input });
		}
	}

	/**
	 * Get a specific parameter value from a node
	 */
	async function getNodeParameter(input: GetNodeParameterInput): Promise<GetNodeParameterResult> {
		try {
			const { nodeId, path } = input;

			// Get current nodes
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			// Support both ID and name lookup for flexibility
			const node = findNodeByIdOrName(currentNodes, nodeId);

			if (!node) {
				return {
					success: false,
					error: `Node "${nodeId}" not found (checked both ID and name)`,
				};
			}

			// Get the parameter value using lodash get
			const value = get(node.parameters ?? {}, path);

			logger?.debug(
				`Script: Got parameter "${path}" from node "${node.name}": ${JSON.stringify(value)}`,
			);

			return {
				success: true,
				value,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error getting node parameter';
			throw new ScriptToolError('getNodeParameter', message, { toolInput: input });
		}
	}

	/**
	 * Validate node configurations (agent prompts, tools, $fromAI usage)
	 */
	async function validateConfiguration(): Promise<ValidateConfigurationResult> {
		try {
			// Build current workflow state
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const currentConnections = getCurrentConnections(workflow, operationsCollector);

			const currentWorkflow: SimpleWorkflow = {
				name: workflow.name,
				nodes: currentNodes,
				connections: currentConnections,
			};

			// Run configuration validations
			const agentPromptViolations = validateAgentPrompt(currentWorkflow);
			const toolViolations = validateTools(currentWorkflow, nodeTypes);
			const fromAiViolations = validateFromAi(currentWorkflow, nodeTypes);
			const allViolations = [...agentPromptViolations, ...toolViolations, ...fromAiViolations];

			const isValid = allViolations.length === 0;
			const issues = allViolations.map((v) => v.description);

			logger?.debug(
				`Script: Validated configuration - ${isValid ? 'valid' : `${issues.length} issues`}`,
			);

			return {
				success: true,
				isValid,
				issues: isValid ? undefined : issues,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error validating configuration';
			return {
				success: false,
				isValid: false,
				error: message,
			};
		}
	}

	/**
	 * Add multiple nodes to the workflow in a single operation.
	 * More efficient than calling addNode multiple times as it only computes
	 * workflow state once instead of O(N) times.
	 */
	async function addNodes(input: AddNodesInput): Promise<AddNodesResult> {
		try {
			const { nodes: inputNodes } = input;

			if (!inputNodes || inputNodes.length === 0) {
				return { success: true, results: [] };
			}

			// Get current nodes ONCE at the start
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const results: AddNodeResult[] = [];
			const newNodes: INode[] = [];

			for (const nodeInput of inputNodes) {
				// Normalize short-form input
				const normalized = normalizeAddNodeInput(nodeInput);
				const { nodeType, name, initialParameters = {} } = normalized;

				// Default version to latest if not specified
				let nodeVersion = normalized.nodeVersion;
				if (nodeVersion === undefined) {
					nodeVersion = findLatestNodeVersion(nodeType);
					if (nodeVersion === undefined) {
						results.push({
							success: false,
							error: `Node type "${nodeType}" not found`,
						});
						continue;
					}
				}

				// Find the node type
				const nodeTypeDesc = findNodeType(nodeType, nodeVersion, nodeTypes);
				if (!nodeTypeDesc) {
					results.push({
						success: false,
						error: `Node type "${nodeType}" version ${nodeVersion} not found`,
					});
					continue;
				}

				// Generate unique name using both existing and newly added nodes
				const baseName = name ?? nodeTypeDesc.defaults?.name ?? nodeTypeDesc.displayName;
				const uniqueName = generateUniqueName(baseName, [...currentNodes, ...newNodes]);

				// Calculate position
				const position = calculateNodePosition(
					[...currentNodes, ...newNodes],
					isSubNode(nodeTypeDesc),
					nodeTypes,
				);

				// Create the node instance
				const newNode = createNodeInstance(
					nodeTypeDesc,
					nodeVersion,
					uniqueName,
					position,
					initialParameters,
				);

				newNodes.push(newNode);

				results.push({
					success: true,
					nodeId: newNode.id,
					nodeName: newNode.name,
					nodeType: newNode.type,
					displayName: nodeTypeDesc.displayName,
					position: newNode.position,
				});
			}

			// Add ALL nodes in a single operation
			if (newNodes.length > 0) {
				const operation: WorkflowOperation = { type: 'addNodes', nodes: newNodes };
				operationsCollector.addOperation(operation);
				logger?.debug(`Script: Added ${newNodes.length} nodes in batch`);
			}

			return { success: true, results };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error adding nodes';
			throw new ScriptToolError('addNodes', message, { toolInput: input });
		}
	}

	/**
	 * Connect multiple node pairs in a single operation.
	 * More efficient than calling connectNodes multiple times as it only
	 * computes workflow state once.
	 */
	async function connectMultiple(input: ConnectMultipleInput): Promise<ConnectMultipleResult> {
		try {
			const { connections: inputConnections } = input;

			if (!inputConnections || inputConnections.length === 0) {
				return { success: true, results: [] };
			}

			// Get current nodes ONCE at the start
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			const results: ConnectNodesResult[] = [];
			const allNewConnections: SimpleWorkflow['connections'] = {};

			for (const connInput of inputConnections) {
				const result = processConnectionInput(connInput, currentNodes, allNewConnections);
				results.push(result);
			}

			// Add ALL connections in a single operation
			if (Object.keys(allNewConnections).length > 0) {
				const operation: WorkflowOperation = {
					type: 'mergeConnections',
					connections: allNewConnections,
				};
				operationsCollector.addOperation(operation);
				logger?.debug(
					`Script: Connected ${results.filter((r) => r.success).length} node pairs in batch`,
				);
			}

			return { success: true, results };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error connecting nodes';
			throw new ScriptToolError('connectMultiple', message, { toolInput: input });
		}
	}

	/**
	 * Process a single connection input for batch operations.
	 * Extracted to reduce complexity in connectMultiple.
	 */
	function processConnectionInput(
		connInput: ConnectNodesInput,
		currentNodes: INode[],
		allNewConnections: SimpleWorkflow['connections'],
	): ConnectNodesResult {
		// Normalize short-form input
		const normalized = normalizeConnectNodesInput(connInput);
		const { sourceOutputIndex = 0, targetInputIndex = 0 } = normalized;

		// Resolve node references
		const sourceNodeId = resolveNodeId(normalized.sourceNodeId);
		const targetNodeId = resolveNodeId(normalized.targetNodeId);

		if (!sourceNodeId) {
			return {
				success: false,
				error: `Invalid source node reference - nodeId not found. Received: ${JSON.stringify(normalized.sourceNodeId)}`,
			};
		}
		if (!targetNodeId) {
			return {
				success: false,
				error: `Invalid target node reference - nodeId not found. Received: ${JSON.stringify(normalized.targetNodeId)}`,
			};
		}

		// Resolve and validate the connection
		const resolved = resolveAndValidateConnection(
			sourceNodeId,
			targetNodeId,
			currentNodes,
			nodeTypes,
			logger,
		);

		if (!resolved.success) {
			return { success: false, error: resolved.error };
		}

		// Add to the connections map
		addToConnectionsMap(
			allNewConnections,
			resolved.sourceNode.name,
			resolved.targetNode.name,
			resolved.connectionType,
			sourceOutputIndex,
			targetInputIndex,
		);

		return {
			success: true,
			sourceNode: resolved.sourceNode.name,
			targetNode: resolved.targetNode.name,
			connectionType: resolved.connectionType,
			swapped: resolved.swapped,
		};
	}

	/**
	 * Add a connection to the connections map (mutates the map).
	 * Extracted to reduce complexity.
	 */
	function addToConnectionsMap(
		connectionsMap: SimpleWorkflow['connections'],
		sourceName: string,
		targetName: string,
		connectionType: string,
		sourceOutputIndex: number,
		targetInputIndex: number,
	): void {
		connectionsMap[sourceName] ??= {};
		connectionsMap[sourceName][connectionType] ??= [];

		// Ensure the output array is large enough
		const connArray = connectionsMap[sourceName][connectionType];
		while (connArray.length <= sourceOutputIndex) {
			connArray.push([]);
		}

		connArray[sourceOutputIndex]!.push({
			node: targetName,
			type: connectionType as NodeConnectionType,
			index: targetInputIndex,
		});
	}

	/**
	 * Directly set node parameters without LLM translation (fastest method)
	 */
	async function setParameters(input: SetParametersInput): Promise<SetParametersResult> {
		try {
			// Resolve node reference
			const nodeId = resolveNodeId(input.nodeId);
			if (!nodeId) {
				return {
					success: false,
					error: `Invalid node reference - nodeId not found. Received: ${JSON.stringify(input.nodeId)}`,
				};
			}

			// Get current nodes
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);
			// Support both ID and name lookup for flexibility
			const nodeToUpdate = findNodeByIdOrName(currentNodes, nodeId);

			if (!nodeToUpdate) {
				return {
					success: false,
					error: `Node "${nodeId}" not found (checked both ID and name)`,
				};
			}

			// Merge or replace parameters
			const currentParams = nodeToUpdate.parameters ?? {};
			const newParams = input.replace ? input.params : { ...currentParams, ...input.params };

			// Use the actual node ID (UUID), not the input which might have been a name
			const actualNodeId = nodeToUpdate.id;

			// Add operation to collector
			const operation: WorkflowOperation = {
				type: 'updateNode',
				nodeId: actualNodeId,
				updates: { parameters: newParams },
			};
			operationsCollector.addOperation(operation);

			logger?.debug(`Script: Set parameters for node "${nodeToUpdate.name}" directly`);

			return {
				success: true,
				parameters: newParams,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error setting parameters';
			throw new ScriptToolError('setParameters', message, { toolInput: input });
		}
	}

	/**
	 * Batch set parameters on multiple nodes without LLM (fastest for bulk)
	 */
	async function setAll(input: BatchSetParametersInput): Promise<BatchSetParametersResult> {
		try {
			const { updates } = input;

			if (!updates || updates.length === 0) {
				return { success: true, results: [] };
			}

			const results: SetParametersResult[] = [];

			// Get current nodes ONCE
			const currentNodes = getCurrentWorkflowNodes(workflow, operationsCollector);

			for (const updateInput of updates) {
				// Resolve node reference
				const nodeId = resolveNodeId(updateInput.nodeId);
				if (!nodeId) {
					results.push({
						success: false,
						error: `Invalid node reference - nodeId not found. Received: ${JSON.stringify(updateInput.nodeId)}`,
					});
					continue;
				}

				// Support both ID and name lookup for flexibility
				const nodeToUpdate = findNodeByIdOrName(currentNodes, nodeId);
				if (!nodeToUpdate) {
					results.push({
						success: false,
						error: `Node "${nodeId}" not found (checked both ID and name)`,
					});
					continue;
				}

				// Merge or replace parameters
				const currentParams = nodeToUpdate.parameters ?? {};
				const newParams = updateInput.replace
					? updateInput.params
					: { ...currentParams, ...updateInput.params };

				// Use the actual node ID (UUID), not the input which might have been a name
				const actualNodeId = nodeToUpdate.id;

				// Add operation to collector
				const operation: WorkflowOperation = {
					type: 'updateNode',
					nodeId: actualNodeId,
					updates: { parameters: newParams },
				};
				operationsCollector.addOperation(operation);

				// Update our local copy so subsequent iterations see the changes
				nodeToUpdate.parameters = newParams;

				results.push({
					success: true,
					parameters: newParams,
				});
			}

			logger?.debug(
				`Script: Set parameters for ${results.filter((r) => r.success).length} nodes directly`,
			);

			return { success: true, results };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error batch setting parameters';
			throw new ScriptToolError('setAll', message, { toolInput: input });
		}
	}

	/**
	 * Batch update multiple nodes' parameters with LLM (single conceptual batch)
	 * Note: Still makes individual LLM calls but processes them in parallel
	 */
	async function updateAll(
		input: BatchUpdateParametersInput,
	): Promise<BatchUpdateParametersResult> {
		try {
			const { updates } = input;

			if (!updates || updates.length === 0) {
				return { success: true, results: [] };
			}

			// Execute all updates in parallel
			const results = await Promise.all(updates.map(updateNodeParameters));

			logger?.debug(
				`Script: Updated parameters for ${results.filter((r) => r.success).length} nodes via LLM`,
			);

			return { success: true, results };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error batch updating parameters';
			throw new ScriptToolError('updateAll', message, { toolInput: input });
		}
	}

	return {
		addNode,
		addNodes,
		add: addNodes, // Alias for reduced token usage
		connectNodes,
		connectMultiple,
		conn: connectMultiple, // Alias for reduced token usage
		removeNode,
		removeConnection,
		renameNode,
		validateStructure,
		updateNodeParameters,
		updateAll, // Batch LLM updates
		setParameters,
		set: setParameters, // Alias for reduced token usage
		setAll, // Batch direct parameter setting
		getNodeParameter,
		validateConfiguration,
	};
}
