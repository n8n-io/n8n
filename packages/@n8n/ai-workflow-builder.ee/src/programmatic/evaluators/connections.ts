import type {
	ExpressionString,
	INodeConnections,
	INodeInputConfiguration,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { SingleEvaluatorResult } from '../types';
import { calcSingleEvaluatorScore } from '../utils/score';

export function resolveConnections<T = INodeInputConfiguration>(
	connections: Array<NodeConnectionType | T> | ExpressionString,
	parameters: Record<string, unknown>,
	nodeVersion: number,
): Array<NodeConnectionType | T> {
	if (Array.isArray(connections)) {
		return connections;
	}

	if (
		typeof connections === 'string' &&
		connections.startsWith('={{') &&
		connections.endsWith('}}')
	) {
		const expressionContent = connections.slice(3, -2).trim();

		try {
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const evalFunc = new Function(
				'$parameter',
				'$nodeVersion',
				`return ${expressionContent}`,
			) as (
				parameters: Record<string, unknown>,
				nodeVersion: number,
			) => Array<NodeConnectionType | T>;

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
			requiredInputs.push({ type: input, required: input === 'main' });
		} else if (typeof input === 'object' && 'type' in input) {
			requiredInputs.push({
				type: input.type,
				required: input.type === 'main' ? true : (input.required ?? false),
			});
		}
	}

	return requiredInputs;
}

function getProvidedInputTypes(
	nodeConnections?: INodeConnections,
): Map<NodeConnectionType, number> {
	const providedInputTypes = new Map<NodeConnectionType, number>();

	if (!nodeConnections) return providedInputTypes;

	for (const [connectionType, connections] of Object.entries(nodeConnections)) {
		let totalConnections = 0;
		for (const connectionSet of connections) {
			if (!connectionSet) continue;
			totalConnections += connectionSet.length;
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
): SingleEvaluatorResult['violations'] {
	const issues: SingleEvaluatorResult['violations'] = [];

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
): SingleEvaluatorResult['violations'] {
	const issues: SingleEvaluatorResult['violations'] = [];

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
	nodeConnections?: INodeConnections,
): SingleEvaluatorResult['violations'] {
	const issues: SingleEvaluatorResult['violations'] = [];

	if (/\.merge$/.test(nodeInfo.node.type)) {
		const providedInputTypes = getProvidedInputTypes(nodeConnections);

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

		const mainConnections = nodeConnections?.main ?? [];
		const missingIndexes: number[] = [];

		for (let inputIndex = 0; inputIndex < expectedInputs; inputIndex++) {
			const connectionsForIndex = mainConnections[inputIndex];
			const hasConnections = Array.isArray(connectionsForIndex) && connectionsForIndex.length > 0;

			if (!hasConnections) {
				missingIndexes.push(inputIndex + 1);
			}
		}

		if (missingIndexes.length > 0) {
			issues.push({
				type: 'major',
				description: `Merge node ${nodeInfo.node.name} is missing connections for input(s) ${missingIndexes.join(', ')}.`,
				pointsDeducted: 20,
			});
		}
	}

	return issues;
}

export function evaluateConnections(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: SingleEvaluatorResult['violations'] = [];

	if (!workflow.connections) {
		workflow.connections = {};
	}

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

		const nodeConnections = connectionsByDestination[node.name];
		const providedInputTypes = getProvidedInputTypes(nodeConnections);

		violations.push(...checkMissingRequiredInputs(nodeInfo, providedInputTypes));

		violations.push(...checkUnsupportedConnections(nodeInfo, providedInputTypes));

		violations.push(...checkMergeNodeConnections(nodeInfo, nodeConnections));
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
