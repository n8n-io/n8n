/**
 * Code Node Validator (Python)
 *
 * Thin graph wrapper around {@link lintPythonCode}.
 */

import { isRecord } from '@n8n/utils/is-record';

import { lintPythonCode } from '../../../lint/code-node-python-lint';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

function getPythonCode(parameters: Record<string, unknown>): string | undefined {
	return typeof parameters.pythonCode === 'string' && parameters.pythonCode.length > 0
		? parameters.pythonCode
		: undefined;
}

function isPython(parameters: Record<string, unknown>): boolean {
	const language = parameters.language;
	return language === 'python' || language === 'pythonNative';
}

/**
 * Validator for Code node Python sandbox misuse.
 */
export const codeNodePythonValidator: ValidatorPlugin = {
	id: 'core:code-node-python',
	name: 'Code Node Python Validator',
	nodeTypes: [CODE_NODE_TYPE],
	priority: 46,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const parameters = node.config?.parameters;
		if (!isRecord(parameters) || !isPython(parameters)) return [];

		const pythonCode = getPythonCode(parameters);
		if (!pythonCode) return [];

		return lintPythonCode(pythonCode, { nodeName: node.name }).map((issue) => ({
			code: issue.code,
			message: issue.message,
			severity: issue.severity,
			violationLevel: issue.code === 'CODE_NODE_NETWORK_CALL' ? 'critical' : 'major',
			nodeName: node.name,
			parameterPath: issue.parameterPath ?? 'pythonCode',
		}));
	},
};
