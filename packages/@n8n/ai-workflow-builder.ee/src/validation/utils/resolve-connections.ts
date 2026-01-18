import type {
	ExpressionString,
	INodeInputConfiguration,
	NodeConnectionType,
	IDataObject,
} from 'n8n-workflow';
import { Expression } from 'n8n-workflow';

import type { NodeResolvedConnectionTypesInfo } from '../types';

function isDynamicConnectionsExpression(
	connections: Array<NodeConnectionType | INodeInputConfiguration> | ExpressionString,
): connections is ExpressionString {
	return (
		typeof connections === 'string' && connections.startsWith('={{') && connections.endsWith('}}')
	);
}

/**
 * Use light version of expression resolver to resolve connections
 * We need only parameter values of the specific node and no workflow context
 */
export function resolveConnections<T = INodeInputConfiguration>(
	connections: Array<NodeConnectionType | T> | ExpressionString,
	parameters: Record<string, unknown>,
	nodeVersion: number,
): Array<NodeConnectionType | T> {
	if (Array.isArray(connections)) {
		return connections;
	}

	if (isDynamicConnectionsExpression(connections)) {
		const context: IDataObject = {};
		Expression.initializeGlobalContext(context);

		Object.assign(context, {
			$parameter: parameters,
			$nodeVersion: nodeVersion,
		});

		const result: unknown = Expression.resolveWithoutWorkflow(connections.substring(1), context);

		if (!Array.isArray(result)) {
			throw new Error('Expression did not resolve to an array');
		}

		return result as Array<NodeConnectionType | T>;
	}

	throw new Error('Unable to resolve connections');
}

export function resolveNodeOutputs(
	nodeInfo: NodeResolvedConnectionTypesInfo,
): Set<NodeConnectionType> {
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

export function resolveNodeInputs(
	nodeInfo: NodeResolvedConnectionTypesInfo,
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
