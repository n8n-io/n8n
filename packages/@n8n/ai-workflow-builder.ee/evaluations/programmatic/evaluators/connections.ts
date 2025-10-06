import type {
	ExpressionString,
	INodeInputConfiguration,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../../types/evaluation';
import type { SingleEvaluatorResult } from '../../types/test-result';
import { calcSingleEvaluatorScore } from '../../utils/score';

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

function resolveNodeOutputs(nodeInfo: NodeInfo): Set<NodeConnectionType> {
	const outputTypes = new Set<NodeConnectionType>();

	if (!nodeInfo.nodeType.outputs) {
		return outputTypes;
	}

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

	return outputTypes;
}

function resolveNodeInputs(
	nodeInfo: NodeInfo,
): Array<{ type: NodeConnectionType; required: boolean }> {
	const requiredInputs: Array<{ type: NodeConnectionType; required: boolean }> = [];

	if (!nodeInfo.nodeType.inputs) {
		return requiredInputs;
	}

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

	return requiredInputs;
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
): Violation[] {
	const issues: Violation[] = [];

	if (!nodeInfo.resolvedInputs) return issues;

	for (const input of nodeInfo.resolvedInputs) {
		const providedCount = providedInputTypes.get(input.type) ?? 0;

		if (input.required && providedCount === 0) {
			issues.push({
				type: 'critical',
				description: `Node ${nodeInfo.node.name} (${nodeInfo.node.type}) is missing required input of type ${input.type}`,
				pointsDeducted: 50,
			});
		}
	}

	return issues;
}

function checkUnsupportedConnections(
	nodeInfo: NodeInfo,
	providedInputTypes: Map<NodeConnectionType, number>,
): Violation[] {
	const issues: Violation[] = [];

	if (!nodeInfo.resolvedInputs) return issues;

	const supportedTypes = new Set(nodeInfo.resolvedInputs.map((input) => input.type));
	for (const [type] of providedInputTypes) {
		if (!supportedTypes.has(type)) {
			issues.push({
				type: 'critical',
				description: `Node ${nodeInfo.node.name} (${nodeInfo.node.type}) received unsupported connection type ${type}`,
				pointsDeducted: 50,
			});
		}
	}

	return issues;
}

function checkMergeNodeConnections(
	nodeInfo: NodeInfo,
	providedInputTypes: Map<NodeConnectionType, number>,
): Violation[] {
	const issues: Violation[] = [];

	// Check if this is a merge node
	if (/\.merge$/.test(nodeInfo.node.type)) {
		// Calculate total number of input connections
		const totalInputConnections = providedInputTypes.get('main') ?? 0;

		if (totalInputConnections < 2) {
			issues.push({
				type: 'major',
				description: `Merge node ${nodeInfo.node.name} has only ${totalInputConnections} input connection(s). Merge nodes require at least 2 inputs to function properly.`,
				pointsDeducted: 20,
			});
		}

		const expectedInputs =
			nodeInfo.resolvedInputs?.filter((input) => input.type === 'main').length ?? 1;

		if (totalInputConnections !== expectedInputs) {
			issues.push({
				type: 'minor',
				description: `Merge node ${nodeInfo.node.name} has ${totalInputConnections} input connections but is configured to accept ${expectedInputs}.`,
				pointsDeducted: 10,
			});
		}
	}

	return issues;
}

export function evaluateConnections(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: Violation[] = [];

	// Ensure workflow has connections object
	if (!workflow.connections) {
		workflow.connections = {};
	}

	// Get connections organized by destination for easier lookup
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);

	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			violations.push({
				type: 'critical',
				description: `Node type ${node.type} not found for node ${node.name}`,
				pointsDeducted: 50,
			});
			continue;
		}

		const nodeInfo: NodeInfo = { node, nodeType };

		try {
			// Resolve inputs and outputs
			nodeInfo.resolvedInputs = resolveNodeInputs(nodeInfo);
			nodeInfo.resolvedOutputs = resolveNodeOutputs(nodeInfo);
		} catch (error) {
			violations.push({
				type: 'critical',
				description: `Failed to resolve connections for node ${node.name} (${node.type}): ${
					error instanceof Error ? error.message : String(error)
				}`,
				pointsDeducted: 50,
			});

			continue;
		}

		// Get provided connections
		const providedInputTypes = getProvidedInputTypes(node.name, connectionsByDestination);

		// Check for missing required inputs
		violations.push(...checkMissingRequiredInputs(nodeInfo, providedInputTypes));

		// Check for unsupported connection types
		violations.push(...checkUnsupportedConnections(nodeInfo, providedInputTypes));

		// Check merge node specific requirements
		violations.push(...checkMergeNodeConnections(nodeInfo, providedInputTypes));
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
