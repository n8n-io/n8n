/**
 * Memory Session Key Validator Plugin
 *
 * Validates that AI memory subnodes do not use ambiguous `$json` references
 * for manually configured session keys.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

const MEMORY_SUBNODE_TYPE = 'ai_memory';
const SESSION_KEY_PARAMETERS = ['sessionKey', 'sessionId'];

function hasSubnodeType(
	node: NodeInstance<string, string, unknown>,
): node is NodeInstance<string, string, unknown> & { readonly _subnodeType: string } {
	return '_subnodeType' in node && typeof node._subnodeType === 'string';
}

function isMemorySubnode(node: NodeInstance<string, string, unknown>): boolean {
	return hasSubnodeType(node) && node._subnodeType === MEMORY_SUBNODE_TYPE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function usesFromInputSessionId(parameters: Record<string, unknown>): boolean {
	return parameters.sessionIdType === 'fromInput';
}

function isUnsafeSessionExpression(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.includes('$json') &&
		(value.startsWith('=') || value.includes('{{'))
	);
}

function createIssue(nodeName: string, parameterPath: string): ValidationIssue {
	return {
		code: 'UNSAFE_MEMORY_SESSION_KEY_EXPRESSION',
		message: `'${nodeName}' parameter '${parameterPath}' uses $json in an AI memory subnode session key. Use an explicit node reference such as nodeJson(trigger, 'message.chat.id') or $('Trigger').item.json.message.chat.id.`,
		severity: 'error',
		violationLevel: 'major',
		nodeName,
		parameterPath,
	};
}

/**
 * Validator for AI memory subnode session key expressions.
 *
 * Checks for:
 * - `$json` in manually configured memory session keys
 * - Does not flag Chat Trigger's `fromInput` memory mode
 */
export const memorySessionKeyValidator: ValidatorPlugin = {
	id: 'core:memory-session-key',
	name: 'Memory Session Key Validator',
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		if (!isMemorySubnode(node)) {
			return [];
		}

		const parameters = node.config?.parameters;
		if (!isRecord(parameters) || usesFromInputSessionId(parameters)) {
			return [];
		}

		return SESSION_KEY_PARAMETERS.flatMap((parameterName) =>
			isUnsafeSessionExpression(parameters[parameterName])
				? [createIssue(node.name, parameterName)]
				: [],
		);
	},
};
