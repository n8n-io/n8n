/**
 * Subnode JSON Reference Validator
 *
 * `$json` inside a tool or memory subnode resolves against whatever the parent
 * last fed the agent, not the trigger or main-flow node the value actually
 * comes from. Use `nodeJson(sourceNode, 'path')`, `$('NodeName').item.json`, or
 * `fromAi(...)` instead.
 *
 * Memory session keys are covered by UNSAFE_MEMORY_SESSION_KEY_EXPRESSION.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const MEMORY_SUBNODE_TYPE = 'ai_memory';
const MEMORY_SESSION_KEY_PATHS = new Set(['sessionKey', 'sessionId']);

/**
 * Subnode kinds where `$json` is genuinely ambiguous: a tool resolves it during
 * agent reasoning, and memory resolves it per parent invocation. Document
 * loaders, splitters and embeddings run once per parent input item, so reading
 * `$json` there is the documented pattern, not a mistake.
 */
const AMBIGUOUS_SUBNODE_TYPES: ReadonlySet<string> = new Set(['ai_tool', MEMORY_SUBNODE_TYPE]);

function subnodeType(node: NodeInstance<string, string, unknown>): string | undefined {
	if ('_subnodeType' in node && typeof node._subnodeType === 'string') {
		return node._subnodeType;
	}
	return undefined;
}

function readsJson(expression: string): boolean {
	return /\$json\b/.test(expression);
}

/**
 * Validator for `$json` references inside AI subnodes.
 */
export const subnodeJsonReferenceValidator: ValidatorPlugin = {
	id: 'core:subnode-json-reference',
	name: 'Subnode JSON Reference Validator',
	priority: 49,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const type = subnodeType(node);
		if (!type || !AMBIGUOUS_SUBNODE_TYPES.has(type)) return [];

		const parameters = node.config?.parameters;
		if (!isRecord(parameters)) return [];

		const issues: ValidationIssue[] = [];
		for (const { expression, path } of extractExpressions(parameters)) {
			if (!readsJson(expression)) continue;
			// Already reported with memory-specific guidance.
			if (type === MEMORY_SUBNODE_TYPE && MEMORY_SESSION_KEY_PATHS.has(path)) continue;

			issues.push({
				code: 'SUBNODE_UNSAFE_JSON_REFERENCE',
				message:
					`'${node.name}' (${type} subnode) parameter '${path}' uses $json. Inside a subnode, $json is ` +
					'whatever the parent last passed in, not the trigger or main-flow item you mean. Use an explicit ' +
					"reference such as nodeJson(sourceNode, 'field.path') or $('NodeName').item.json.field" +
					(type === 'ai_tool' ? ', or fromAi(...) for values the agent should supply.' : '.'),
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: path,
			});
		}

		return issues;
	},
};
