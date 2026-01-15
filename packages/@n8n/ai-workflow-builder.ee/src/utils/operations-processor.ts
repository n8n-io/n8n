import type { INode, IConnections, INodeParameters, NodeParameterValueType } from 'n8n-workflow';
import {
	applyAccessPatterns,
	NODES_WITH_RENAMABLE_CONTENT,
	NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT,
	FORM_NODE_TYPE,
} from 'n8n-workflow';

import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';

/**
 * Type guard to check if a value is a valid NodeParameterValueType
 */
function isNodeParameterValueType(value: unknown): value is NodeParameterValueType {
	if (value === null || value === undefined) return true;
	const type = typeof value;
	if (type === 'string' || type === 'number' || type === 'boolean') return true;
	if (Array.isArray(value)) return value.every(isNodeParameterValueType);
	if (type === 'object') return true;
	return false;
}

/**
 * Type guard to check if a value is a record with string keys
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for form field with HTML content
 */
function isHtmlFormField(
	field: unknown,
): field is { fieldType: string; html: NodeParameterValueType } {
	return (
		isRecord(field) &&
		'fieldType' in field &&
		field.fieldType === 'html' &&
		'html' in field &&
		isNodeParameterValueType(field.html)
	);
}

/**
 * Type guard for form fields structure
 */
function isFormFieldsWithValues(value: unknown): value is { values?: unknown[] } {
	return isRecord(value) && (!('values' in value) || Array.isArray(value.values));
}

/**
 * Type for operation handler functions
 */
type OperationHandler = (workflow: SimpleWorkflow, operation: WorkflowOperation) => SimpleWorkflow;

/**
 * Handle 'clear' operation - reset workflow to empty state
 */
function applyClearOperation(
	_workflow: SimpleWorkflow,
	_operation: WorkflowOperation,
): SimpleWorkflow {
	return { nodes: [], connections: {}, name: '' };
}

/**
 * Handle 'removeNode' operation - remove nodes and their connections
 */
function applyRemoveNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'removeNode') return workflow;

	const nodesToRemove = new Set(operation.nodeIds);

	// Build a set of node names to remove (connections are keyed by node name in n8n)
	const nodeNamesToRemove = new Set<string>();
	for (const node of workflow.nodes) {
		if (nodesToRemove.has(node.id)) {
			nodeNamesToRemove.add(node.name);
		}
	}

	// Filter out removed nodes
	const nodes = workflow.nodes.filter((node) => !nodesToRemove.has(node.id));

	// Clean up connections
	const cleanedConnections: IConnections = {};

	// Copy connections, excluding those from/to removed nodes (using node names)
	for (const [sourceName, nodeConnections] of Object.entries(workflow.connections)) {
		if (!nodeNamesToRemove.has(sourceName)) {
			cleanedConnections[sourceName] = {};

			for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
				if (Array.isArray(outputs)) {
					cleanedConnections[sourceName][connectionType] = outputs.map((outputConnections) => {
						if (Array.isArray(outputConnections)) {
							return outputConnections.filter((conn) => !nodeNamesToRemove.has(conn.node));
						}
						return outputConnections;
					});
				}
			}
		}
	}

	return {
		...workflow,
		nodes,
		connections: cleanedConnections,
	};
}

/**
 * Handle 'addNodes' operation - add or update nodes in workflow
 */
function applyAddNodesOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'addNodes') return workflow;

	// Create a map for quick lookup
	const nodeMap = new Map<string, INode>();
	workflow.nodes.forEach((node) => nodeMap.set(node.id, node));

	// Add or update nodes
	operation.nodes.forEach((node) => {
		nodeMap.set(node.id, node);
	});

	return {
		...workflow,
		nodes: Array.from(nodeMap.values()),
	};
}

/**
 * Handle 'updateNode' operation - update specific node properties
 */
function applyUpdateNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'updateNode') return workflow;

	const nodes = workflow.nodes.map((node) => {
		if (node.id === operation.nodeId) {
			return { ...node, ...operation.updates };
		}
		return node;
	});

	return {
		...workflow,
		nodes,
	};
}

/**
 * Handle 'setConnections' operation - replace all connections
 */
function applySetConnectionsOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'setConnections') return workflow;

	return {
		...workflow,
		connections: operation.connections,
	};
}

/**
 * Handle 'mergeConnections' operation - merge new connections with existing ones
 */
function applyMergeConnectionsOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'mergeConnections') return workflow;

	const connections = { ...workflow.connections };

	// Merge connections additively
	for (const [sourceId, nodeConnections] of Object.entries(operation.connections)) {
		if (!connections[sourceId]) {
			connections[sourceId] = nodeConnections;
		} else {
			// Merge connections for this source node
			for (const [connectionType, newOutputs] of Object.entries(nodeConnections)) {
				if (!connections[sourceId][connectionType]) {
					connections[sourceId][connectionType] = newOutputs;
				} else {
					// Merge arrays of connections
					const existingOutputs = connections[sourceId][connectionType];

					if (Array.isArray(newOutputs) && Array.isArray(existingOutputs)) {
						// Merge each output index
						for (let i = 0; i < Math.max(newOutputs.length, existingOutputs.length); i++) {
							if (!newOutputs[i]) continue;

							if (!existingOutputs[i]) {
								existingOutputs[i] = newOutputs[i];
							} else if (Array.isArray(newOutputs[i]) && Array.isArray(existingOutputs[i])) {
								// Merge connections at this output index, avoiding duplicates
								const existingSet = new Set(
									existingOutputs[i]!.map((conn) =>
										JSON.stringify({ node: conn.node, type: conn.type, index: conn.index }),
									),
								);

								newOutputs[i]!.forEach((conn) => {
									const connStr = JSON.stringify({
										node: conn.node,
										type: conn.type,
										index: conn.index,
									});
									if (!existingSet.has(connStr)) {
										existingOutputs[i]!.push(conn);
									}
								});
							}
						}
					}
				}
			}
		}
	}

	return {
		...workflow,
		connections,
	};
}

/**
 * Handle 'removeConnection' operation - remove specific connection between nodes
 */
function applyRemoveConnectionOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'removeConnection') return workflow;

	const { sourceNode, targetNode, connectionType, sourceOutputIndex, targetInputIndex } = operation;

	const connections = { ...workflow.connections };

	// Check if source node has connections
	if (!connections[sourceNode]) {
		return workflow;
	}

	// Check if the connection type exists
	const connectionTypeOutputs = connections[sourceNode][connectionType];
	if (!connectionTypeOutputs || !Array.isArray(connectionTypeOutputs)) {
		return workflow;
	}

	// Check if the output index exists
	if (
		sourceOutputIndex >= connectionTypeOutputs.length ||
		!connectionTypeOutputs[sourceOutputIndex]
	) {
		return workflow;
	}

	const outputConnections = connectionTypeOutputs[sourceOutputIndex];
	if (!Array.isArray(outputConnections)) {
		return workflow;
	}

	// Filter out the specific connection
	const filteredConnections = outputConnections.filter(
		(conn) =>
			!(
				conn.node === targetNode &&
				conn.type === connectionType &&
				conn.index === targetInputIndex
			),
	);

	// Update the connections array
	connectionTypeOutputs[sourceOutputIndex] = filteredConnections;

	// Clean up empty arrays and objects
	if (filteredConnections.length === 0) {
		// Check if all outputs of this type are empty
		const hasAnyConnections = connectionTypeOutputs.some(
			(outputs) => Array.isArray(outputs) && outputs.length > 0,
		);

		// If no connections remain for this type, remove the connection type
		if (!hasAnyConnections) {
			delete connections[sourceNode][connectionType];

			// If no connection types remain, remove the source node entry
			if (Object.keys(connections[sourceNode]).length === 0) {
				delete connections[sourceNode];
			}
		}
	}

	return {
		...workflow,
		connections,
	};
}

/**
 * Handle 'setName' operation - update workflow name
 */
function applySetNameOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'setName') return workflow;
	return {
		...workflow,
		name: operation.name,
	};
}

/**
 * Recursively update node name references in parameter values
 */
function renameNodeInParameterValue(
	parameterValue: NodeParameterValueType,
	currentName: string,
	newName: string,
	{ hasRenamableContent } = { hasRenamableContent: false },
): NodeParameterValueType {
	if (typeof parameterValue !== 'object') {
		if (
			typeof parameterValue === 'string' &&
			(parameterValue.charAt(0) === '=' || hasRenamableContent)
		) {
			return applyAccessPatterns(parameterValue, currentName, newName);
		}
		return parameterValue;
	}

	if (parameterValue === null) {
		return parameterValue;
	}

	if (Array.isArray(parameterValue)) {
		const mappedArray = parameterValue.map((item) => {
			if (!isNodeParameterValueType(item)) return item;
			return renameNodeInParameterValue(item, currentName, newName, {
				hasRenamableContent,
			});
		});
		return mappedArray as NodeParameterValueType;
	}

	const returnData: Record<string, NodeParameterValueType> = {};
	for (const parameterName of Object.keys(parameterValue)) {
		const value = parameterValue[parameterName as keyof typeof parameterValue];
		if (isNodeParameterValueType(value)) {
			returnData[parameterName] = renameNodeInParameterValue(value, currentName, newName, {
				hasRenamableContent,
			});
		} else {
			returnData[parameterName] = value as NodeParameterValueType;
		}
	}
	return returnData;
}

/**
 * Handle 'renameNode' operation - rename a node and update all connection references and expressions
 */
function applyRenameNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'renameNode') return workflow;

	const { nodeId, oldName, newName } = operation;

	// 1. Update node name
	const nodes = workflow.nodes.map((node) => {
		if (node.id === nodeId) {
			return { ...node, name: newName };
		}
		return node;
	});

	// 2. Update connections - rename source keys and target references
	const connections: IConnections = {};
	for (const [sourceNodeName, nodeConnections] of Object.entries(workflow.connections)) {
		const newSourceName = sourceNodeName === oldName ? newName : sourceNodeName;
		connections[newSourceName] = {};

		for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
			if (Array.isArray(outputs)) {
				connections[newSourceName][connectionType] = outputs.map((outputConnections) => {
					if (Array.isArray(outputConnections)) {
						return outputConnections.map((conn) => ({
							...conn,
							node: conn.node === oldName ? newName : conn.node,
						}));
					}
					return outputConnections;
				});
			}
		}
	}

	// 3. Update expressions in all nodes that reference the renamed node
	const updatedNodes = nodes.map((node) => {
		// Update expressions in parameters
		let parameters = renameNodeInParameterValue(
			node.parameters,
			oldName,
			newName,
		) as INodeParameters;

		// Handle special node types with renamable content (Code nodes, etc.)
		if (NODES_WITH_RENAMABLE_CONTENT.has(node.type) && parameters.jsCode) {
			parameters = {
				...parameters,
				jsCode: renameNodeInParameterValue(parameters.jsCode, oldName, newName, {
					hasRenamableContent: true,
				}),
			};
		}

		// Handle HTML node types
		if (NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT.has(node.type) && parameters.html) {
			parameters = {
				...parameters,
				html: renameNodeInParameterValue(parameters.html, oldName, newName, {
					hasRenamableContent: true,
				}),
			};
		}

		// Handle Form node - HTML is nested inside formFields.values[].html
		if (node.type === FORM_NODE_TYPE && isRecord(parameters.formFields)) {
			const formFields = parameters.formFields;
			if (isFormFieldsWithValues(formFields) && Array.isArray(formFields.values)) {
				const updatedValues = formFields.values.map((field) => {
					if (isHtmlFormField(field)) {
						return {
							...field,
							html: renameNodeInParameterValue(field.html, oldName, newName, {
								hasRenamableContent: true,
							}),
						};
					}
					return field;
				});
				const updatedFormFields = { ...formFields, values: updatedValues };
				parameters = {
					...parameters,
					formFields: updatedFormFields as NodeParameterValueType,
				};
			}
		}

		return { ...node, parameters };
	});

	return { ...workflow, nodes: updatedNodes, connections };
}

/**
 * Map of operation types to their handler functions
 */
const operationHandlers: Record<WorkflowOperation['type'], OperationHandler> = {
	clear: applyClearOperation,
	removeNode: applyRemoveNodeOperation,
	addNodes: applyAddNodesOperation,
	updateNode: applyUpdateNodeOperation,
	setConnections: applySetConnectionsOperation,
	mergeConnections: applyMergeConnectionsOperation,
	removeConnection: applyRemoveConnectionOperation,
	setName: applySetNameOperation,
	renameNode: applyRenameNodeOperation,
};

/**
 * Apply a list of operations to a workflow
 */
export function applyOperations(
	workflow: SimpleWorkflow,
	operations: WorkflowOperation[],
): SimpleWorkflow {
	// Start with a copy of the current workflow
	let result: SimpleWorkflow = {
		nodes: [...workflow.nodes],
		connections: { ...workflow.connections },
		name: workflow.name || '',
	};

	// Apply each operation in sequence
	for (const operation of operations) {
		const handler = operationHandlers[operation.type];
		result = handler(result, operation);
	}

	return result;
}

/**
 * Process operations node for the LangGraph workflow
 * This node applies accumulated operations to the workflow state
 */
export function processOperations(state: {
	workflowJSON: SimpleWorkflow;
	workflowOperations?: WorkflowOperation[] | null;
}) {
	const { workflowJSON, workflowOperations } = state;

	// If no operations to process, return unchanged
	if (!workflowOperations || workflowOperations.length === 0) {
		return {};
	}

	// Apply all operations to get the new workflow
	const newWorkflow = applyOperations(workflowJSON, workflowOperations);

	// Return updated state with cleared operations
	return {
		workflowJSON: newWorkflow,
		workflowOperations: null, // Clear processed operations
		workflowValidation: null, // Invalidate stale validation results
	};
}
