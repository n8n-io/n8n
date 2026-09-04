/**
 * Expression Prefix Validator Plugin
 *
 * Validates that expressions have the required '=' prefix.
 */

import { isFromAIOnlyExpression } from 'n8n-workflow';

import { isStickyNoteType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { isPlaceholderValue, parseVersion } from '../../string-utils';
import { findMissingExpressionPrefixes } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext, NodeTypesProvider } from '../types';

/** Shape of the node-type properties this validator reads. */
type PropertyLike = {
	name?: unknown;
	noDataExpression?: unknown;
	typeOptions?: { editor?: unknown };
};

const isPropertyLike = (value: unknown): value is PropertyLike =>
	typeof value === 'object' && value !== null;

/**
 * The node's parameters that cannot hold an expression, mapped to whether the
 * parameter is a SQL editor field.
 *
 * A parameter declared `noDataExpression` loses a leading '=' whenever
 * `getNodeParameters` resolves it, which happens on every editor load and on
 * every execution. The two kinds behave differently once the prefix is gone:
 *
 * - a SQL editor field (BigQuery, Postgres, Merge's combineBySql) resolves its
 *   own inline `{{ }}` through `getResolvables()`, so the prefix-free value is
 *   the working form;
 * - any other field uses the value literally.
 *
 * Only top-level properties are scanned. Every SQL editor field is declared
 * there, and a name can be declared more than once (BigQuery declares
 * `sqlQuery` for both SQL dialects), so one SQL editor declaration is enough.
 */
function parametersWithoutExpressionSupport(
	node: NodeInstance<string, string, unknown>,
	provider: NodeTypesProvider,
): Map<string, boolean> {
	const properties =
		provider.getByNameAndVersion(node.type, parseVersion(node.version))?.description?.properties ??
		[];

	const fields = new Map<string, boolean>();

	for (const property of properties) {
		if (!isPropertyLike(property)) continue;
		if (property.noDataExpression !== true) continue;
		if (typeof property.name !== 'string') continue;

		const isSqlEditor = property.typeOptions?.editor === 'sqlEditor';
		fields.set(property.name, fields.get(property.name) === true || isSqlEditor);
	}

	return fields;
}

/** Message for a value that a field declared `noDataExpression` cannot carry. */
function unsupportedExpressionMessage(
	nodeName: string,
	parameter: string,
	{ isSqlEditor, hasPrefix }: { isSqlEditor: boolean; hasPrefix: boolean },
): string {
	if (!hasPrefix) {
		return `'${nodeName}' has parameter "${parameter}" containing {{ $... }}, but the field does not support expressions, so the value is used literally.`;
	}

	const remedy = isSqlEditor
		? "Keep the {{ }} inline and drop the leading '='."
		: 'Use a static value.';

	return `'${nodeName}' has parameter "${parameter}" starting with '=', but the field does not support expressions. n8n removes the prefix when the workflow is opened in the editor or executed. ${remedy}`;
}

/**
 * Validator for expression prefixes.
 *
 * Checks for:
 * - Expressions like {{ $json }} or {{ $now }} that are missing the '=' prefix
 * - n8n expressions must start with '=' like '={{ $json.field }}'
 * - Values a field declared `noDataExpression` cannot carry, which n8n rewrites
 *   silently (needs a node-type provider)
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
		// Without a provider the parameter's declaration is unknown, so the generic
		// rule below applies to every path. That is the behavior from before these
		// checks became node-type aware.
		const noExpressionParams = provider
			? parametersWithoutExpressionSupport(node, provider)
			: new Map<string, boolean>();

		for (const [parameter, isSqlEditor] of noExpressionParams) {
			const value = (params as Record<string, unknown>)[parameter];
			if (typeof value !== 'string' || isPlaceholderValue(value)) continue;
			// A lone $fromAI() placeholder keeps its '=' by design, so it is correct
			// as written (see getNodeParameters).
			if (isFromAIOnlyExpression(value)) continue;

			const hasPrefix = value.startsWith('=');
			// A prefix-free inline template is the working form on a SQL editor field,
			// and a value with neither a prefix nor a template says nothing about
			// expressions.
			if (!hasPrefix && (isSqlEditor || !value.includes('{{ $'))) continue;

			issues.push({
				code: 'UNSUPPORTED_EXPRESSION',
				message: unsupportedExpressionMessage(node.name, parameter, { isSqlEditor, hasPrefix }),
				severity: 'warning',
				nodeName: node.name,
				parameterPath: parameter,
			});
		}

		const prefixIssues = findMissingExpressionPrefixes(params);

		for (const { path } of prefixIssues) {
			// Exact path only: a nested parameter that happens to share the name of a
			// top-level parameter without expression support is a different field.
			// These paths are reported above with an accurate message instead.
			if (noExpressionParams.has(path)) {
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
