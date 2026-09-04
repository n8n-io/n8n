/**
 * Expression Prefix Validator Plugin
 *
 * Validates that expressions have the required '=' prefix.
 */

import { isStickyNoteType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { parseVersion } from '../../string-utils';
import { findMissingExpressionPrefixes } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext, NodeTypesProvider } from '../types';

/** Shape of the node-type properties this validator reads. */
type PropertyLike = {
	name?: unknown;
	typeOptions?: { editor?: unknown };
};

const isPropertyLike = (value: unknown): value is PropertyLike =>
	typeof value === 'object' && value !== null;

/**
 * Names of the node's SQL-editor parameters.
 *
 * A SQL-editor field (Postgres, MySQL, BigQuery, Merge's combineBySql) resolves
 * its own inline `{{ }}` at execution time. n8n also stores such a field without
 * the '=' prefix, because the field declares `noDataExpression` and
 * `getNodeParameters` strips the prefix on every editor load and every execution.
 * A warning here would ask the caller to add a prefix that n8n removes again, so
 * these parameters are exempt.
 *
 * Only top-level properties are scanned. Every SQL-editor field is declared there.
 */
function sqlEditorParameterNames(
	node: NodeInstance<string, string, unknown>,
	provider: NodeTypesProvider,
): Set<string> {
	const properties =
		provider.getByNameAndVersion(node.type, parseVersion(node.version))?.description?.properties ??
		[];

	const names = new Set<string>();

	for (const property of properties) {
		if (!isPropertyLike(property)) continue;
		if (property.typeOptions?.editor !== 'sqlEditor') continue;
		if (typeof property.name === 'string') names.add(property.name);
	}

	return names;
}

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
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Skip sticky notes - they're documentation, not code
		if (isStickyNoteType(node.type)) {
			return issues;
		}

		// Skip HTML template node - it uses {{ }} natively for template expressions
		if (node.type === 'n8n-nodes-base.html') {
			return issues;
		}

		const params = node.config?.parameters;
		if (!params) {
			return issues;
		}

		const provider = ctx.validationOptions?.nodeTypesProvider;
		// Without a provider the editor type is unknown, so every path is reported.
		// That is the behavior from before this exemption.
		const exemptParameters = provider ? sqlEditorParameterNames(node, provider) : new Set<string>();

		const prefixIssues = findMissingExpressionPrefixes(params);

		for (const { path } of prefixIssues) {
			// Exact path only: a nested parameter that happens to share the name of a
			// top-level SQL-editor field is a different field and still gets reported.
			if (exemptParameters.has(path)) {
				continue;
			}

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
