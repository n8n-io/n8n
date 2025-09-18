import type { ExpressionString, INodeInputConfiguration, NodeConnectionType } from 'n8n-workflow';

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
