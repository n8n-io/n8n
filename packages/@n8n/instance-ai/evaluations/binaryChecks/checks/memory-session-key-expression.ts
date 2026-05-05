import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { collectSourcesByConnectionType } from '../utils';

const SESSION_KEY_PARAMETERS = ['sessionKey', 'sessionId'];

function isMemoryNode(type: string): boolean {
	const shortName = type.split('.').pop() ?? '';
	return shortName.toLowerCase().includes('memory');
}

function isExpressionUsingJson(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.includes('$json') &&
		(value.startsWith('=') || value.includes('{{'))
	);
}

function usesFromInputSessionId(parameters: Record<string, unknown>): boolean {
	return parameters.sessionIdType === 'fromInput';
}

function getUnsafeSessionKeyParameters(node: WorkflowNodeResponse): string[] {
	const parameters = node.parameters;
	if (!parameters || usesFromInputSessionId(parameters)) return [];

	return SESSION_KEY_PARAMETERS.filter((parameterName) =>
		isExpressionUsingJson(parameters[parameterName]),
	);
}

export const memorySessionKeyExpression: BinaryCheck = {
	name: 'memory_session_key_expression',
	description: 'AI memory custom session keys use explicit source node references',
	kind: 'deterministic',
	run(workflow) {
		const connectedMemoryNodeNames = collectSourcesByConnectionType(
			workflow.connections ?? {},
			'ai_memory',
		);
		const memoryNodes = (workflow.nodes ?? []).filter(
			(node) => connectedMemoryNodeNames.has(node.name) && isMemoryNode(node.type),
		);

		const issues = memoryNodes.flatMap((node) =>
			getUnsafeSessionKeyParameters(node).map(
				(parameterName) => `"${node.name}" uses $json in ${parameterName}`,
			),
		);

		return {
			pass: issues.length === 0,
			...(issues.length > 0
				? {
						comment: `Memory session keys should reference the trigger/source node explicitly: ${issues.join('; ')}`,
					}
				: {}),
		};
	},
};
