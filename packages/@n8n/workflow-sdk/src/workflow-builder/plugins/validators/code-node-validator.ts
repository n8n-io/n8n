/**
 * Code Node Validator
 *
 * Flags Code-node mistakes that always fail at runtime:
 * - Network calls (fetch/axios/etc.) — the sandbox has no network access
 * - Forbidden module imports (luxon, openai, …)
 * - `$input.all()` in runOnceForEachItem mode — that API is unavailable there
 * - Nested template literals that often break after save / serialization
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const NETWORK_CALL =
	/\b(?:fetch|axios|XMLHttpRequest)\s*\(|require\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)|\bimport\s*\(\s*['"](?:node:)?(?:http|https|http2|node-fetch|axios|got|undici)['"]\s*\)/;

const FORBIDDEN_MODULE =
	/(?:require\s*\(\s*['"]|import\s*\(\s*['"]|from\s+['"])(?:luxon|openai|@openai\/|langchain|@langchain\/)/;

const INPUT_ALL = /\$input\.all\s*\(/;

/**
 * Nested template literals (`` `...${`...`}...` ``) often break when the Code
 * parameter is saved/reloaded. Detect a template that embeds another template
 * via `${` … `` ` `` … `}`.
 */
function hasNestedTemplateLiterals(jsCode: string): boolean {
	let inTemplate = false;
	let depth = 0;
	for (let i = 0; i < jsCode.length; i++) {
		const ch = jsCode[i];
		const prev = i > 0 ? jsCode[i - 1] : '';
		if (ch === '`' && prev !== '\\') {
			if (!inTemplate) {
				inTemplate = true;
				depth = 0;
			} else if (depth === 0) {
				inTemplate = false;
			} else {
				// Nested closing/opening backtick inside ${...}
				return true;
			}
			continue;
		}
		if (!inTemplate) continue;
		if (ch === '$' && jsCode[i + 1] === '{') {
			depth += 1;
			i += 1;
			continue;
		}
		if (ch === '}' && depth > 0) {
			depth -= 1;
		}
	}
	return false;
}

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

		if (FORBIDDEN_MODULE.test(jsCode)) {
			issues.push({
				code: 'CODE_NODE_FORBIDDEN_IMPORT',
				message:
					`'${node.name}' Code node imports a module unavailable in the sandbox (luxon, openai, langchain, …). ` +
					'Use JavaScript `Date`/`Intl`, `$now`/`$today`, existing workflow data, or dedicated AI nodes instead.',
				severity: 'warning',
				violationLevel: 'major',
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

		if (hasNestedTemplateLiterals(jsCode)) {
			issues.push({
				code: 'CODE_NESTED_TEMPLATE_LITERAL',
				message:
					`'${node.name}' Code node uses nested template literals, which often break after save. ` +
					'Build multi-line strings with arrays joined by a runtime separator, e.g. ' +
					'`const LF = String.fromCharCode(10); return lines.join(LF);`.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'jsCode',
			});
		}

		return issues;
	},
};
