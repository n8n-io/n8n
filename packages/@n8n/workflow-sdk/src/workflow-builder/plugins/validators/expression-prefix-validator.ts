/**
 * Expression Prefix Validator Plugin
 *
 * Validates that expressions have the required '=' prefix.
 */

import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { isFromAIOnlyExpression, NodeHelpers } from 'n8n-workflow';

import { isStickyNoteType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { isPlaceholderValue, parseVersion } from '../../string-utils';
import { findMissingExpressionPrefixes } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext, NodeTypesProvider } from '../types';

/**
 * The node's description, or `undefined` when the provider cannot resolve it.
 *
 * `NodeTypesProvider` is structural and deliberately loose, so the description
 * is narrowed here for the `NodeHelpers` calls below. The provider handed to
 * plugin validators is already guarded, so a type or version this instance does
 * not have reads as `undefined` rather than throwing.
 */
function resolveDescription(
	node: NodeInstance<string, string, unknown>,
	provider: NodeTypesProvider,
): INodeTypeDescription | undefined {
	const description = provider.getByNameAndVersion(
		node.type,
		parseVersion(node.version),
	)?.description;

	return description as INodeTypeDescription | undefined;
}

/**
 * The node's visible parameters that cannot hold an expression, mapped to
 * whether the parameter is a SQL editor field.
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
 * One name can be declared several times behind different `displayOptions`, and
 * those declarations can disagree. Wait v1.1 declares `incomingAuthentication`
 * for both `resume: form`, which allows expressions, and `resume: webhook`,
 * which does not. Only the declaration the node's own values display counts, so
 * visibility is resolved the way `getNodeParameters` resolves it, defaults
 * included. A name whose visible declarations disagree is left out, because
 * neither verdict is safe to report.
 */
function parametersWithoutExpressionSupport(
	node: NodeInstance<string, string, unknown>,
	params: INodeParameters,
	provider: NodeTypesProvider,
): Map<string, boolean> {
	const description = resolveDescription(node, provider);
	const properties: INodeProperties[] = description?.properties ?? [];

	// Most nodes declare none, and resolving defaults below is not free.
	if (!properties.some((property) => property.noDataExpression === true)) {
		return new Map();
	}

	const nodeStub = { typeVersion: parseVersion(node.version) };
	// `displayOptions` read sibling values, so the visibility check needs every
	// parameter carrying its default, hidden ones included. A declaration can
	// branch on a sibling that is itself hidden, and a display-filtered set drops
	// that sibling, which makes both declarations of a duplicated name read as
	// hidden. These arguments are the ones `getNodeParameters` uses to build its
	// own display-check set, so this pass resolves visibility the same way.
	const values =
		NodeHelpers.getNodeParameters(properties, params, true, true, nodeStub, description ?? null, {
			onlySimpleTypes: true,
			dataIsResolved: true,
		}) ?? params;

	const withoutSupport = new Map<string, boolean>();
	const withSupport = new Set<string>();

	for (const property of properties) {
		if (!NodeHelpers.displayParameter(values, property, nodeStub, description ?? null)) continue;

		if (property.noDataExpression === true) {
			withoutSupport.set(property.name, property.typeOptions?.editor === 'sqlEditor');
		} else {
			withSupport.add(property.name);
		}
	}

	for (const name of withSupport) {
		withoutSupport.delete(name);
	}

	return withoutSupport;
}

/** Message for a value that a field declared `noDataExpression` cannot carry. */
function unsupportedExpressionMessage(
	nodeName: string,
	parameter: string,
	{
		isSqlEditor,
		hasPrefix,
		hasTemplate,
	}: { isSqlEditor: boolean; hasPrefix: boolean; hasTemplate: boolean },
): string {
	if (!hasPrefix) {
		return `'${nodeName}' has parameter "${parameter}" containing {{ $... }}, but the field does not support expressions, so the value is used literally.`;
	}

	const remedy = !isSqlEditor
		? 'Use a static value.'
		: hasTemplate
			? "Keep the {{ }} inline and drop the leading '='."
			: "Drop the leading '='.";

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
			? parametersWithoutExpressionSupport(node, params as INodeParameters, provider)
			: new Map<string, boolean>();

		for (const [parameter, isSqlEditor] of noExpressionParams) {
			const value = (params as Record<string, unknown>)[parameter];
			if (typeof value !== 'string' || isPlaceholderValue(value)) continue;

			const hasPrefix = value.startsWith('=');
			// A lone $fromAI() placeholder keeps its '=' by design, so a prefixed one
			// is correct as written (see getNodeParameters). Without the prefix it is
			// not protected by anything, so it is reported like any other template.
			if (hasPrefix && isFromAIOnlyExpression(value)) continue;

			const hasTemplate = value.includes('{{ $');
			// A prefix-free inline template is the working form on a SQL editor field,
			// and a value with neither a prefix nor a template says nothing about
			// expressions.
			if (!hasPrefix && (isSqlEditor || !hasTemplate)) continue;

			issues.push({
				code: 'UNSUPPORTED_EXPRESSION',
				message: unsupportedExpressionMessage(node.name, parameter, {
					isSqlEditor,
					hasPrefix,
					hasTemplate,
				}),
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
