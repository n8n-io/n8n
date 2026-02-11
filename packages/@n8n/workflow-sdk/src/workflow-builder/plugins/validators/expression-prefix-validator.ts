/**
 * Expression Prefix Validator Plugin
 *
 * Validates that expressions have the required '=' prefix.
 */

import { isStickyNoteType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { findMissingExpressionPrefixes } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for expression prefixes.
 *
 * Checks for:
 * - Expressions like {{ $json }} or {{ $now }} that are missing the '=' prefix
 * - n8n expressions must start with '=' like '={{ $json.field }}'
 */
export const expressionPrefixValidator: ValidatorPlugin = {
	id: 'core:expression-prefix',
	name: 'Expression Prefix Validator',
	priority: 30,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Skip sticky notes - they're documentation, not code
		if (isStickyNoteType(node.type)) {
			return issues;
		}

		const params = node.config?.parameters;
		if (!params) {
			return issues;
		}

		const prefixIssues = findMissingExpressionPrefixes(params);

		for (const { path } of prefixIssues) {
			issues.push({
				code: 'MISSING_EXPRESSION_PREFIX',
				message: `'${node.name}' has parameter "${path}" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.`,
				severity: 'warning',
				nodeName: node.name,
				parameterPath: path,
			});
		}

		return issues;
	},
};
