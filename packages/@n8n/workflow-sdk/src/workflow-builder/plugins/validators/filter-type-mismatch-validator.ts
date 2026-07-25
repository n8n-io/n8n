/**
 * Filter Type Mismatch Validator
 *
 * Catches IF / Switch / Filter conditions that compare a boolean left-hand
 * value with a string operator under strict type validation. That pattern is
 * valid structurally (so filter-node / schema validate pass) but fails at
 * runtime — e.g. `$json.matched` is `true` while the condition uses
 * `operator: { type: 'string', operation: 'equals' }` with `rightValue: 'true'`.
 *
 * Detection uses two signals:
 * 1. Fixture / Set-assignment evidence that the left-hand field is boolean.
 * 2. Heuristic: string equals/notEquals against the literals `'true'` / `'false'`
 *    when `typeValidation` is `'strict'`.
 */

import { isRecord } from '@n8n/utils/is-record';

import { mainInputSources } from './connection-helpers';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { parseExpression } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const FILTER_NODE_TYPES = ['n8n-nodes-base.if', 'n8n-nodes-base.switch', 'n8n-nodes-base.filter'];
const SET_NODE_TYPE = 'n8n-nodes-base.set';
const STRING_BOOLEAN_LITERALS = new Set(['true', 'false']);
const STRING_COMPARE_OPS = new Set(['equals', 'notEquals']);

const FIX_HINT =
	"Use a boolean operator instead, e.g. operator: { type: 'boolean', operation: 'true', singleValue: true } " +
	"(rightValue: ''), or set typeValidation to 'loose' only when coercion is intentional.";

function unwrapItemJson(item: Record<string, unknown>): Record<string, unknown> {
	if ('json' in item && isRecord(item.json)) {
		return item.json;
	}
	return item;
}

function getByPath(shape: Record<string, unknown>, path: string[]): unknown {
	let current: unknown = shape;
	for (const key of path) {
		if (!isRecord(current) || !(key in current)) {
			return undefined;
		}
		current = current[key];
	}
	return current;
}

function declaredOutputShape(
	node: NodeInstance<string, string, unknown>,
): Record<string, unknown> | undefined {
	const output = node.config?.output;
	if (Array.isArray(output) && output.length > 0 && isRecord(output[0])) {
		return unwrapItemJson(output[0]);
	}
	const pinData = node.config?.pinData;
	if (Array.isArray(pinData) && pinData.length > 0 && isRecord(pinData[0])) {
		return unwrapItemJson(pinData[0]);
	}
	return undefined;
}

/** Top-level Set assignment types keyed by field name. */
function setAssignmentTypes(node: NodeInstance<string, string, unknown>): Map<string, string> {
	const types = new Map<string, string>();
	if (node.type !== SET_NODE_TYPE) return types;

	const params = node.config?.parameters;
	if (!isRecord(params)) return types;
	const assignmentsWrapper = params.assignments;
	if (!isRecord(assignmentsWrapper)) return types;
	const assignments = assignmentsWrapper.assignments;
	if (!Array.isArray(assignments)) return types;

	for (const entry of assignments) {
		if (!isRecord(entry)) continue;
		const name = typeof entry.name === 'string' ? entry.name : undefined;
		const type = typeof entry.type === 'string' ? entry.type : undefined;
		if (name && type) {
			types.set(name, type);
		}
	}
	return types;
}

function collectBooleanEvidence(
	nodes: ReadonlyMap<string, GraphNode>,
	sourceNames: readonly string[],
	fieldPath: string[],
): boolean {
	for (const sourceName of sourceNames) {
		const graphNode = nodes.get(sourceName);
		if (!graphNode) continue;

		const shape = declaredOutputShape(graphNode.instance);
		if (shape !== undefined) {
			const value = getByPath(shape, fieldPath);
			if (typeof value === 'boolean') {
				return true;
			}
		}

		// Set assignment types only describe top-level fields.
		if (fieldPath.length === 1) {
			const assignmentType = setAssignmentTypes(graphNode.instance).get(fieldPath[0]);
			if (assignmentType === 'boolean') {
				return true;
			}
		}
	}
	return false;
}

function leftValueString(leftValue: unknown): string | undefined {
	return typeof leftValue === 'string' && leftValue.length > 0 ? leftValue : undefined;
}

function typeValidationOf(filterValue: Record<string, unknown>): string | undefined {
	const options = filterValue.options;
	if (!isRecord(options)) return undefined;
	return typeof options.typeValidation === 'string' ? options.typeValidation : undefined;
}

function shouldFlagCondition(
	condition: Record<string, unknown>,
	typeValidation: string | undefined,
	nodes: ReadonlyMap<string, GraphNode>,
	predecessors: readonly string[],
): boolean {
	const operator = condition.operator;
	if (!isRecord(operator) || operator.type !== 'string') {
		return false;
	}

	const operation = typeof operator.operation === 'string' ? operator.operation : undefined;
	const rightValue = condition.rightValue;
	const rightIsBooleanLiteral =
		typeof rightValue === 'string' && STRING_BOOLEAN_LITERALS.has(rightValue.toLowerCase());

	const left = leftValueString(condition.leftValue);
	if (!left) return false;

	const parsed = parseExpression(left);
	let leftIsBoolean = false;
	if (parsed.type === '$json' && parsed.fieldPath.length > 0) {
		leftIsBoolean = collectBooleanEvidence(nodes, predecessors, parsed.fieldPath);
	} else if (parsed.type === '$node' && parsed.nodeName && parsed.fieldPath.length > 0) {
		leftIsBoolean = collectBooleanEvidence(nodes, [parsed.nodeName], parsed.fieldPath);
	}

	// Fixture / Set evidence: string operator against a boolean field is always
	// wrong unless the filter intentionally coerces (typeValidation: 'loose').
	if (leftIsBoolean && typeValidation !== 'loose') {
		return true;
	}

	// Heuristic for the common LLM mistake when no fixture is available.
	if (
		typeValidation === 'strict' &&
		operation !== undefined &&
		STRING_COMPARE_OPS.has(operation) &&
		rightIsBooleanLiteral
	) {
		return true;
	}

	return false;
}

function validateFilterValue(
	filterValue: Record<string, unknown>,
	nodeName: string,
	paramPath: string,
	nodes: ReadonlyMap<string, GraphNode>,
	predecessors: readonly string[],
): ValidationIssue[] {
	const conditions = filterValue.conditions;
	if (!Array.isArray(conditions)) return [];

	const typeValidation = typeValidationOf(filterValue);
	const issues: ValidationIssue[] = [];

	for (let i = 0; i < conditions.length; i++) {
		const condition = conditions[i];
		if (!isRecord(condition)) continue;
		if (!shouldFlagCondition(condition, typeValidation, nodes, predecessors)) continue;

		issues.push({
			code: 'FILTER_BOOLEAN_COMPARED_AS_STRING',
			message:
				`'${nodeName}' condition at ${paramPath}.conditions[${i}] compares a boolean value with a ` +
				`string operator under strict type validation. ${FIX_HINT}`,
			severity: 'warning',
			violationLevel: 'major',
			nodeName,
			parameterPath: `${paramPath}.conditions[${i}]`,
		});
	}

	return issues;
}

/**
 * Validator for boolean-vs-string IF / Switch / Filter condition mismatches.
 */
export const filterTypeMismatchValidator: ValidatorPlugin = {
	id: 'core:filter-type-mismatch',
	name: 'Filter Type Mismatch Validator',
	nodeTypes: FILTER_NODE_TYPES,
	priority: 41,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const predecessors = mainInputSources(node.name, ctx.nodes);
		const issues: ValidationIssue[] = [];

		const conditions = params.conditions;
		if (isRecord(conditions) && 'conditions' in conditions) {
			issues.push(
				...validateFilterValue(conditions, node.name, 'conditions', ctx.nodes, predecessors),
			);
		}

		const rules = params.rules;
		if (isRecord(rules)) {
			const values = rules.values ?? rules.rules;
			if (Array.isArray(values)) {
				for (let i = 0; i < values.length; i++) {
					const rule = values[i];
					if (!isRecord(rule)) continue;
					const ruleConditions = rule.conditions;
					if (isRecord(ruleConditions) && 'conditions' in ruleConditions) {
						issues.push(
							...validateFilterValue(
								ruleConditions,
								node.name,
								`rules.values[${i}].conditions`,
								ctx.nodes,
								predecessors,
							),
						);
					}
				}
			}
		}

		return issues;
	},
};
