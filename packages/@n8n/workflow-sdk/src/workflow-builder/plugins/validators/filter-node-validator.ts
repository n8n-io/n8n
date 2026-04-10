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
			message: `${nodeRef} is missing 'options' in ${paramPath}. Add: options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }`,
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
