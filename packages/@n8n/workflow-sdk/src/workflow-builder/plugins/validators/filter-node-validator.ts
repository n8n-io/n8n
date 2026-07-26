/**
 * Filter Node Validator Plugin
 *
 * Validates IF, Switch, and Filter nodes for correct conditions structure.
 * These nodes use the 'filter' parameter type which requires a specific shape:
 * { options: FilterOptionsValue, conditions: FilterConditionValue[], combinator: 'and' | 'or' }
 *
 * The UI's FilterConditions component always hydrates these defaults, but
 * programmatic creation (e.g. the AI builder) can produce incomplete structures
 * that crash at execution time — or worse, silently always take the true branch
 * when `conditions: {}` is saved.
 *
 * IF / Filter typeVersion < 2 is also rejected: those versions ignore the V2
 * filter shape entirely. On IF v1, empty/unrecognized conditions + default
 * combineOperation 'all' vacuously route every item to the true branch.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { lookupDefaultVersion, resolveTypeVersion } from '../../string-utils';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
	isAutoRenamed,
	formatNodeRef,
} from '../types';

const FILTER_NODE_TYPES = ['n8n-nodes-base.if', 'n8n-nodes-base.switch', 'n8n-nodes-base.filter'];
const IF_OR_FILTER_TYPES = new Set(['n8n-nodes-base.if', 'n8n-nodes-base.filter']);
/** Filter-parameter conditions only execute on IF/Filter v2+. */
const MIN_FILTER_TYPE_VERSION = 2;

/**
 * Check a single filter value object for missing required fields.
 */
function validateFilterValue(
	filterValue: Record<string, unknown>,
	nodeRef: string,
	paramPath: string,
	nodeName: string,
	originalName: string | undefined,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (!filterValue.options || typeof filterValue.options !== 'object') {
		issues.push({
			code: 'FILTER_MISSING_OPTIONS',
			message: `${nodeRef} is missing 'options' in ${paramPath}. Add: options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' }`,
			severity: 'error',
			nodeName,
			originalName,
			parameterPath: `${paramPath}.options`,
		});
	}

	if (!Array.isArray(filterValue.conditions) || filterValue.conditions.length === 0) {
		issues.push({
			code: 'FILTER_MISSING_CONDITIONS',
			message: `${nodeRef} is missing or has empty 'conditions' array in ${paramPath}. Add at least one condition with leftValue, operator, and rightValue.`,
			severity: 'error',
			nodeName,
			originalName,
			parameterPath: `${paramPath}.conditions`,
		});
	}

	if (filterValue.combinator === undefined) {
		issues.push({
			code: 'FILTER_MISSING_COMBINATOR',
			message: `${nodeRef} is missing 'combinator' in ${paramPath}. Add: combinator: 'and'`,
			severity: 'error',
			nodeName,
			originalName,
			parameterPath: `${paramPath}.combinator`,
		});
	}

	return issues;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const filterNodeValidator: ValidatorPlugin = {
	id: 'core:filter-node',
	name: 'Filter Node Validator',
	nodeTypes: FILTER_NODE_TYPES,
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const params = node.config?.parameters as Record<string, unknown> | undefined;

		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;
		const renamed = isAutoRenamed(mapKey, originalName);
		const displayName = renamed ? mapKey : originalName;
		const origForWarning = renamed ? originalName : undefined;
		const nodeRef = formatNodeRef(displayName, origForWarning, node.type);

		// IF and Filter: `conditions` must be a full filter value. Empty `{}` used to
		// skip validation entirely and produced always-true runtime behavior.
		if (IF_OR_FILTER_TYPES.has(node.type)) {
			const typeVersion = resolveTypeVersion(
				node.version,
				lookupDefaultVersion(node.type, ctx.validationOptions?.defaultVersions),
			);
			if (typeVersion < MIN_FILTER_TYPE_VERSION) {
				issues.push({
					code: 'FILTER_OUTDATED_TYPE_VERSION',
					message:
						`${nodeRef} uses typeVersion ${typeVersion}, but filter-shaped \`conditions\` only run on ` +
						`v${MIN_FILTER_TYPE_VERSION}+. Raise \`version\` to ${MIN_FILTER_TYPE_VERSION}+. ` +
						'On v1, V2 conditions are ignored and every item takes the true branch.',
					severity: 'error',
					nodeName: displayName,
					originalName: origForWarning,
					parameterPath: 'version',
				});
				return issues;
			}

			const conditions = params?.conditions;
			if (!isPlainObject(conditions)) {
				issues.push({
					code: 'FILTER_MISSING_CONDITIONS',
					message: `${nodeRef} is missing 'conditions'. Provide a filter value: { options, conditions: [...], combinator }.`,
					severity: 'error',
					nodeName: displayName,
					originalName: origForWarning,
					parameterPath: 'conditions',
				});
			} else {
				issues.push(
					...validateFilterValue(conditions, nodeRef, 'conditions', displayName, origForWarning),
				);
			}
		}

		// Switch node: conditions are nested inside rules.values[].conditions
		const rules = params?.rules as Record<string, unknown> | undefined;
		if (rules && typeof rules === 'object') {
			// Check for wrong key name (common LLM mistake: rules.rules instead of rules.values)
			if ('rules' in rules && !('values' in rules)) {
				issues.push({
					code: 'SWITCH_WRONG_RULES_KEY',
					message: `${nodeRef} uses 'rules.rules' but the Switch node expects 'rules.values'. Rename the inner key from 'rules' to 'values'.`,
					severity: 'error',
					nodeName: displayName,
					originalName: origForWarning,
					parameterPath: 'rules',
				});
			}

			// Validate filter values inside each rule — including empty `{}`
			const values = (rules.values ?? rules.rules) as Array<Record<string, unknown>> | undefined;
			if (Array.isArray(values)) {
				for (let i = 0; i < values.length; i++) {
					const rule = values[i];
					const ruleConditions = rule?.conditions;
					const paramPath = `rules.values[${i}].conditions`;
					if (!isPlainObject(ruleConditions)) {
						issues.push({
							code: 'FILTER_MISSING_CONDITIONS',
							message: `${nodeRef} is missing '${paramPath}'. Provide a filter value: { options, conditions: [...], combinator }.`,
							severity: 'error',
							nodeName: displayName,
							originalName: origForWarning,
							parameterPath: paramPath,
						});
					} else {
						issues.push(
							...validateFilterValue(
								ruleConditions,
								nodeRef,
								paramPath,
								displayName,
								origForWarning,
							),
						);
					}
				}
			}
		}

		return issues;
	},
};
