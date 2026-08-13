/**
 * Chain LLM Validator Plugin
 *
 * Validates Chain LLM nodes for common configuration issues.
 * Only applies to versions >= 1.4 when promptType was introduced.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { parseVersion } from '../../string-utils';
import { containsExpression, containsMalformedExpression } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for Chain LLM nodes.
 *
 * Checks for:
 * - Static prompts without expressions (should usually have dynamic input)
 * Only validates versions >= 1.4 when promptType was introduced.
 */
export const chainLlmValidator: ValidatorPlugin = {
	id: 'core:chain-llm',
	name: 'Chain LLM Validator',
	nodeTypes: ['@n8n/n8n-nodes-langchain.chainLlm'],
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Only validate versions >= 1.4 (when promptType was introduced)
		const version = parseVersion(node.version);
		if (version < 1.4) {
			return issues;
		}

		const params = node.config?.parameters as Record<string, unknown> | undefined;
		if (!params) {
			return issues;
		}

		const promptType = params.promptType as string | undefined;

		// Only check when promptType is 'define' (explicit prompt definition)
		if (promptType !== 'define') {
			return issues;
		}

		// Check: Static prompt (no expression)
		const text = params.text;
		const hasValidExpression = containsExpression(text);
		const hasMalformedExpression = containsMalformedExpression(text);

		// Only warn about static prompt if there's NO expression at all
		// (MISSING_EXPRESSION_PREFIX will handle malformed expressions)
		if (!text || (!hasValidExpression && !hasMalformedExpression)) {
			issues.push({
				code: 'AGENT_STATIC_PROMPT',
				message: `'${node.name}' has no expression in its prompt. Parameter values must start with '=' to evaluate correctly as expressions. For example '={{ $json.input }}'.`,
				severity: 'warning',
				nodeName: node.name,
			});
		}

		return issues;
	},
};
