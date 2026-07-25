/**
 * Code Node Validator
 *
 * Flags Code-node mistakes that always fail at runtime:
 * - Network calls (fetch/axios/etc.) — the sandbox has no network access
 * - `$input.all()` in runOnceForEachItem mode — that API is unavailable there
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const NETWORK_CALL =
	/\b(?:fetch|axios|XMLHttpRequest)\s*\(|require\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)|\bimport\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)/;

const INPUT_ALL = /\$input\.all\s*\(/;

function getJsCode(parameters: Record<string, unknown>): string | undefined {
	return typeof parameters.jsCode === 'string' && parameters.jsCode.length > 0
		? parameters.jsCode
		: undefined;
}

function isRunOnceForEachItem(parameters: Record<string, unknown>): boolean {
	return parameters.mode === 'runOnceForEachItem';
}

/**
 * Validator for Code node sandbox and mode API misuse.
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
		if (!isRecord(parameters)) return [];

		const jsCode = getJsCode(parameters);
		if (!jsCode) return [];

		const issues: ValidationIssue[] = [];

		if (NETWORK_CALL.test(jsCode)) {
			issues.push({
				code: 'CODE_NODE_NETWORK_CALL',
				message:
					`'${node.name}' Code node calls fetch/axios/XMLHttpRequest or requires an HTTP module. ` +
					'Code nodes have no network access at runtime — make the HTTP/API call with an HTTP Request node ' +
					'and transform its output in the Code node instead.',
				severity: 'warning',
				violationLevel: 'critical',
				nodeName: node.name,
				parameterPath: 'jsCode',
			});
		}

		if (isRunOnceForEachItem(parameters) && INPUT_ALL.test(jsCode)) {
			issues.push({
				code: 'CODE_MODE_API_MISUSE',
				message:
					`'${node.name}' uses mode: 'runOnceForEachItem' but calls $input.all(). ` +
					'$input.all() is only available in runOnceForAllItems (the default). ' +
					'Switch mode to runOnceForAllItems, or use $input.item / $json for per-item work.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'mode',
			});
		}

		return issues;
	},
};
