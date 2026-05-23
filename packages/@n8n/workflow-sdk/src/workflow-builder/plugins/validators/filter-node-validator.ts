/**
 * Filter Node Validator Plugin
 *
 * Validates IF, Switch, and Filter nodes for correct conditions structure.
 * These nodes use the 'filter' parameter type which requires a specific shape:
 * { options: FilterOptionsValue, conditions: FilterConditionValue[], combinator: 'and' | 'or' }
 *
 * The UI's FilterConditions component always hydrates these defaults, but
 * programmatic creation (e.g. the AI builder) can produce incomplete structures
 * that crash at execution time.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
	isAutoRenamed,
	formatNodeRef,
} from '../types';

const FILTER_NODE_TYPES = ['n8n-nodes-base.if', 'n8n-nodes-base.switch', 'n8n-nodes-base.filter'];

/**
 * A literal looks ambiguously cased if it mixes upper and lower letters,
 * e.g. "High" or "Active". All-lowercase ("high") or all-uppercase ("HIGH",
 * "GET", "POST", "ACTIVE_STATUS") are treated as intentional.
 */
function looksAmbiguouslyCased(value: string): boolean {
	if (!/[a-z]/.test(value)) return false;
	if (!/[A-Z]/.test(value)) return false;
	return true;
}

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

	issues.push(...validateCaseSensitivity(filterValue, nodeRef, paramPath, nodeName, originalName));

	return issues;
}

/**
 * Warn when a filter uses caseSensitive: true with a string-equals condition
 * against an ambiguously cased literal (e.g. "High"). User-supplied input
 * casing is rarely guaranteed and case-sensitive matching silently routes
 * items to the wrong branch.
 */
function validateCaseSensitivity(
	filterValue: Record<string, unknown>,
	nodeRef: string,
	paramPath: string,
	nodeName: string,
	originalName: string | undefined,
): ValidationIssue[] {
	const options = filterValue.options as Record<string, unknown> | undefined;
	if (!options || options.caseSensitive !== true) return [];

	const conditions = filterValue.conditions;
	if (!Array.isArray(conditions)) return [];

	const issues: ValidationIssue[] = [];
	for (let i = 0; i < conditions.length; i++) {
		const cond = conditions[i] as Record<string, unknown> | undefined;
		if (!cond) continue;

		const operator = cond.operator as Record<string, unknown> | undefined;
		if (operator?.type !== 'string' || operator.operation !== 'equals') continue;

		const rightValue = cond.rightValue;
		if (typeof rightValue !== 'string') continue;
		if (rightValue.startsWith('=')) continue; // expression, not a literal
		if (!looksAmbiguouslyCased(rightValue)) continue;

		issues.push({
			code: 'FILTER_AMBIGUOUS_CASE_SENSITIVITY',
			message: `${nodeRef} uses caseSensitive: true to match the literal "${rightValue}" in ${paramPath}.conditions[${String(i)}]. User-supplied values often arrive with different casing (e.g. "${rightValue.toLowerCase()}"). Unless the user has explicitly said case matters, set caseSensitive: false in ${paramPath}.options — or ask them to confirm.`,
			severity: 'warning',
			nodeName,
			originalName,
			parameterPath: `${paramPath}.options.caseSensitive`,
		});
	}

	return issues;
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
		if (!params) return issues;

		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;
		const renamed = isAutoRenamed(mapKey, originalName);
		const displayName = renamed ? mapKey : originalName;
		const origForWarning = renamed ? originalName : undefined;
		const nodeRef = formatNodeRef(displayName, origForWarning, node.type);

		// IF and Filter nodes: conditions is directly on params
		const conditions = params.conditions as Record<string, unknown> | undefined;
		if (
			conditions &&
			typeof conditions === 'object' &&
			('conditions' in conditions || 'options' in conditions || 'combinator' in conditions)
		) {
			issues.push(
				...validateFilterValue(conditions, nodeRef, 'conditions', displayName, origForWarning),
			);
		}

		// Switch node: conditions are nested inside rules.values[].conditions
		const rules = params.rules as Record<string, unknown> | undefined;
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

			// Validate filter values inside each rule
			const values = (rules.values ?? rules.rules) as Array<Record<string, unknown>> | undefined;
			if (Array.isArray(values)) {
				for (let i = 0; i < values.length; i++) {
					const rule = values[i];
					const ruleConditions = rule?.conditions as Record<string, unknown> | undefined;
					if (
						ruleConditions &&
						typeof ruleConditions === 'object' &&
						'conditions' in ruleConditions
					) {
						issues.push(
							...validateFilterValue(
								ruleConditions,
								nodeRef,
								`rules.values[${i}].conditions`,
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
