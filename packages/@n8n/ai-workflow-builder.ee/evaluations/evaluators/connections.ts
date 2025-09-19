import type {
	ExpressionString,
	INodeInputConfiguration,
	NodeConnectionType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

export function resolveConnections<T = INodeInputConfiguration>(
	connections: Array<NodeConnectionType | T> | ExpressionString,
	parameters: Record<string, unknown>,
	nodeVersion: number,
): Array<NodeConnectionType | T> {
	// If it's already an array, return it as is
	if (Array.isArray(connections)) {
		return connections;
	}

	// If it's a string expression, evaluate it
	if (
		typeof connections === 'string' &&
		connections.startsWith('={{') &&
		connections.endsWith('}}')
	) {
		// Extract the expression content between ={{ and }}
		const expressionContent = connections.slice(3, -2).trim();

		try {
			// Create a function that evaluates the expression
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const evalFunc = new Function(
				'$parameter',
				'$nodeVersion',
				`return ${expressionContent}`,
			) as (
				parameters: Record<string, unknown>,
				nodeVersion: number,
			) => Array<NodeConnectionType | T>;

			// Evaluate expression with provided parameters and nodeVersion
			const result = evalFunc(parameters, nodeVersion);

			return result;
		} catch (error) {
			console.error('Failed to evaluate expression:', error);
			throw error;
		}
	}

	throw new Error('Unable to resolve connections');
}

interface NodeInfo {
	node: SimpleWorkflow['nodes'][0];
	nodeType: INodeTypeDescription;
	resolvedInputs?: Array<{ type: NodeConnectionType; required: boolean }>;
	resolvedOutputs?: Set<NodeConnectionType>;
}

function resolveNodeOutputs(nodeInfo: NodeInfo): {
	outputs: Set<NodeConnectionType>;
	error?: string;
} {
	const outputTypes = new Set<NodeConnectionType>();

	if (!nodeInfo.nodeType.outputs) {
		return { outputs: outputTypes };
	}

	try {
		const resolvedOutputs = resolveConnections(
			nodeInfo.nodeType.outputs,
			nodeInfo.node.parameters,
			nodeInfo.node.typeVersion || 1,
		);

		for (const output of resolvedOutputs) {
			if (typeof output === 'string') {
				outputTypes.add(output);
			} else if (typeof output === 'object' && 'type' in output) {
				outputTypes.add(output.type);
			}
		}
		return { outputs: outputTypes };
	} catch (error) {
		return {
			outputs: outputTypes,
			error: `Failed to resolve outputs for node ${nodeInfo.node.name} (${nodeInfo.node.type}): ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

function resolveNodeInputs(nodeInfo: NodeInfo): {
	inputs: Array<{ type: NodeConnectionType; required: boolean }>;
	error?: string;
} {
	const requiredInputs: Array<{ type: NodeConnectionType; required: boolean }> = [];

	if (!nodeInfo.nodeType.inputs) {
		return { inputs: requiredInputs };
	}

	try {
		const resolvedInputs = resolveConnections(
			nodeInfo.nodeType.inputs,
			nodeInfo.node.parameters,
			nodeInfo.node.typeVersion || 1,
		);

		for (const input of resolvedInputs) {
			if (typeof input === 'string') {
				// All main inputs should be treated as required
				requiredInputs.push({ type: input, required: input === 'main' });
			} else if (typeof input === 'object' && 'type' in input) {
				requiredInputs.push({
					type: input.type,
					// Main inputs are always required, otherwise use the specified required value
					required: input.type === 'main' ? true : (input.required ?? false),
				});
			}
		}
		return { inputs: requiredInputs };
	} catch (error) {
		return {
			inputs: requiredInputs,
			error: `Failed to resolve inputs for node ${nodeInfo.node.name} (${nodeInfo.node.type}): ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

function getProvidedInputTypes(
	nodeName: string,
	connectionsByDestination: ReturnType<typeof mapConnectionsByDestination>,
): Map<NodeConnectionType, number> {
	const providedInputTypes = new Map<NodeConnectionType, number>();
	const nodeConnections = connectionsByDestination[nodeName] || {};

	// Count connections by type
	for (const [connectionType, connections] of Object.entries(nodeConnections)) {
		let totalConnections = 0;
		for (const connectionSet of connections) {
			if (connectionSet) {
				totalConnections += connectionSet.length;
			}
		}
		if (totalConnections > 0) {
			providedInputTypes.set(connectionType as NodeConnectionType, totalConnections);
		}
	}

	return providedInputTypes;
}

function checkMissingRequiredInputs(
	nodeInfo: NodeInfo,
	providedInputTypes: Map<NodeConnectionType, number>,
): string[] {
	const issues: string[] = [];

	if (!nodeInfo.resolvedInputs) return issues;

	for (const input of nodeInfo.resolvedInputs) {
		const providedCount = providedInputTypes.get(input.type) ?? 0;

		if (input.required && providedCount === 0) {
			issues.push(
				`Node ${nodeInfo.node.name} (${nodeInfo.node.type}) is missing required input of type ${input.type}`,
			);
		}
	}

	return issues;
}

function checkUnsupportedConnections(
	nodeInfo: NodeInfo,
	providedInputTypes: Map<NodeConnectionType, number>,
): string[] {
	const issues: string[] = [];

	if (!nodeInfo.resolvedInputs) return issues;

	const supportedTypes = new Set(nodeInfo.resolvedInputs.map((input) => input.type));
	for (const [type] of providedInputTypes) {
		if (!supportedTypes.has(type)) {
			issues.push(
				`Node ${nodeInfo.node.name} (${nodeInfo.node.type}) received unsupported connection type ${type}`,
			);
		}
	}

	return issues;
}

function checkMergeNodeConnections(
	nodeInfo: NodeInfo,
	providedInputTypes: Map<NodeConnectionType, number>,
): string[] {
	const issues: string[] = [];

	// Check if this is a merge node
	const nodeName = nodeInfo.node.type.toLowerCase();
	if (nodeName.includes('merge') || nodeName.includes('join')) {
		// Calculate total number of input connections
		let totalInputConnections = 0;
		for (const [_type, count] of providedInputTypes) {
			totalInputConnections += count;
		}

		if (totalInputConnections < 2) {
			issues.push(
				`Merge node ${nodeInfo.node.name} has only ${totalInputConnections} input connection(s). Merge nodes require at least 2 inputs to function properly.`,
			);
		}
	}

	return issues;
}

export function evaluateConnections(workflow: SimpleWorkflow, nodeTypes: INodeTypeDescription[]) {
	const issues: string[] = [];

	// Ensure workflow has connections object
	if (!workflow.connections) {
		workflow.connections = {};
	}

	// Get connections organized by destination for easier lookup
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);

	// Build node information map
	const nodeInfoMap = new Map<string, NodeInfo>();

	// First pass: resolve outputs for all nodes
	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			issues.push(`Node type ${node.type} not found for node ${node.name}`);
			continue;
		}

		const nodeInfo: NodeInfo = { node, nodeType };

		// Resolve outputs
		const outputResult = resolveNodeOutputs(nodeInfo);
		if (outputResult.error) {
			issues.push(outputResult.error);
		}
		nodeInfo.resolvedOutputs = outputResult.outputs;

		nodeInfoMap.set(node.name, nodeInfo);
	}

	// Second pass: check input requirements and connections
	for (const node of workflow.nodes) {
		const nodeInfo = nodeInfoMap.get(node.name);
		if (!nodeInfo) continue;

		// Resolve inputs
		const inputResult = resolveNodeInputs(nodeInfo);
		if (inputResult.error) {
			issues.push(inputResult.error);
			continue;
		}
		nodeInfo.resolvedInputs = inputResult.inputs;

		// Get provided connections
		const providedInputTypes = getProvidedInputTypes(node.name, connectionsByDestination);

		// Check for missing required inputs
		issues.push(...checkMissingRequiredInputs(nodeInfo, providedInputTypes));

		// Check for unsupported connection types
		issues.push(...checkUnsupportedConnections(nodeInfo, providedInputTypes));

		// Check merge node specific requirements
		issues.push(...checkMergeNodeConnections(nodeInfo, providedInputTypes));
	}

	return { issues };
}
