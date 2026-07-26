/**
 * Code Node Validator (JavaScript)
 *
 * Thin graph wrapper around {@link lintJsCode}.
 */

import { isRecord } from '@n8n/utils/is-record';

import { lintJsCode } from '../../../lint/code-node-js-lint';
import type { CodeExecutionMode } from '../../../lint/extract-code-snippets';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

function getJsCode(parameters: Record<string, unknown>): string | undefined {
	return typeof parameters.jsCode === 'string' && parameters.jsCode.length > 0
		? parameters.jsCode
		: undefined;
}

function isJavaScript(parameters: Record<string, unknown>): boolean {
	const language = parameters.language;
	return language === undefined || language === 'javaScript';
}

function getMode(parameters: Record<string, unknown>): CodeExecutionMode | undefined {
	return parameters.mode === 'runOnceForEachItem' ? 'runOnceForEachItem' : 'runOnceForAllItems';
}

/**
 * Validator for Code node JavaScript sandbox and mode API misuse.
 */
export const codeNodeValidator: ValidatorPlugin = {
	id: 'core:code-node',
	name: 'Code Node Validator',
	nodeTypes: [CODE_NODE_TYPE],
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const parameters = node.config?.parameters;
		if (!isRecord(parameters) || !isJavaScript(parameters)) return [];

		const jsCode = getJsCode(parameters);
		if (!jsCode) return [];

		return lintJsCode(jsCode, { mode: getMode(parameters), nodeName: node.name }).map((issue) => ({
			code: issue.code,
			message: issue.message,
			severity: issue.severity,
			violationLevel:
				issue.code === 'CODE_NODE_NETWORK_CALL'
					? 'critical'
					: issue.code === 'CODE_MODE_API_MISUSE' ||
							issue.code === 'CODE_NODE_FORBIDDEN_IMPORT' ||
							issue.code === 'CODE_NESTED_TEMPLATE_LITERAL'
						? 'major'
						: undefined,
			nodeName: node.name,
			parameterPath: issue.parameterPath ?? 'jsCode',
		}));
	},
};
