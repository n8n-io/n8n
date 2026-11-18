import type { CustomRule, CustomRuleRequirement } from './schema';
import type { RawFinding, RegexTester, RuleContext, RuleNode, RuleWorkflow } from './types';
import {
	getCheckedNodes,
	getParameter,
	getSetting,
	hasValue,
	isExpression,
} from './workflow-access';

function nodeSubjectValue(node: RuleNode, requirement: CustomRuleRequirement): unknown {
	switch (requirement.subject) {
		case 'parameter':
			return getParameter(node, requirement.path ?? '');
		case 'nodeName':
			return node.name;
		case 'nodeType':
			return node.type;
		case 'credentialType':
			return Object.keys(node.credentials ?? {});
		case 'disabled':
			return node.disabled === true;
		case 'retryOnFail':
			return node.retryOnFail === true;
		default:
			return undefined;
	}
}

function workflowSubjectValue(workflow: RuleWorkflow, requirement: CustomRuleRequirement): unknown {
	switch (requirement.subject) {
		case 'workflowName':
			return workflow.name;
		case 'description':
			return workflow.description ?? undefined;
		case 'setting':
			return getSetting(workflow, requirement.path ?? '');
		case 'nodeCount':
			return getCheckedNodes(workflow).length;
		default:
			return undefined;
	}
}

function asText(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function asNumber(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(asText(value));
	return Number.isFinite(parsed) ? parsed : undefined;
}

function scalarHolds(value: unknown, requirement: CustomRuleRequirement, regex: RegexTester) {
	const { operator, value: expected, flags } = requirement;
	const text = asText(value);
	const expectedText = asText(expected) ?? '';
	const list = Array.isArray(expected) ? expected : [];

	switch (operator) {
		case 'equals':
			return text === expectedText;
		case 'notEquals':
			return text !== expectedText;
		case 'oneOf':
			return text !== undefined && list.includes(text);
		case 'notOneOf':
			return text === undefined || !list.includes(text);
		case 'contains':
			return text !== undefined && text.includes(expectedText);
		case 'notContains':
			return text === undefined || !text.includes(expectedText);
		case 'matches':
			return text !== undefined && regex.test(expectedText, text, flags);
		case 'notMatches':
			return text === undefined || !regex.test(expectedText, text, flags);
		case 'lessThan': {
			const actual = asNumber(value);
			const limit = asNumber(expected);
			return actual !== undefined && limit !== undefined && actual < limit;
		}
		case 'greaterThan': {
			const actual = asNumber(value);
			const limit = asNumber(expected);
			return actual !== undefined && limit !== undefined && actual > limit;
		}
		default:
			return true;
	}
}

/** True when the subject value meets the requirement. */
export function requirementHolds(
	value: unknown,
	requirement: CustomRuleRequirement,
	regex: RegexTester,
): boolean {
	const { operator } = requirement;
	if (operator === 'isSet') return hasValue(value);
	if (operator === 'isNotSet') return !hasValue(value);
	if (operator === 'isExpression') return isExpression(value);
	if (operator === 'isNotExpression') return !isExpression(value);

	if (!Array.isArray(value)) return scalarHolds(value, requirement, regex);

	// A list subject (credential types) holds for a positive operator when any item holds,
	// and for a negative operator only when every item holds.
	const negative = operator.startsWith('not');
	if (operator === 'oneOf') {
		return value.length > 0 && value.every((item) => scalarHolds(item, requirement, regex));
	}
	return negative
		? value.every((item) => scalarHolds(item, requirement, regex))
		: value.some((item) => scalarHolds(item, requirement, regex));
}

function messageFor(rule: CustomRule, workflow: RuleWorkflow, node?: RuleNode): string {
	if (rule.message) {
		return rule.message
			.replaceAll('{node}', node?.name ?? '')
			.replaceAll('{workflow}', workflow.name);
	}
	return node
		? `Node "${node.name}" does not meet the rule "${rule.name}".`
		: `The workflow does not meet the rule "${rule.name}".`;
}

export function evaluateCustomRule(
	workflow: RuleWorkflow,
	rule: CustomRule,
	ctx: RuleContext,
): RawFinding[] {
	const { target, require: requirement } = rule;

	if (target.kind === 'workflow') {
		const value = workflowSubjectValue(workflow, requirement);
		if (requirementHolds(value, requirement, ctx.regex)) return [];
		return [{ message: messageFor(rule, workflow), params: { rule: rule.name } }];
	}

	const nodeTypes = new Set(target.nodeTypes);
	return getCheckedNodes(workflow)
		.filter((node) => nodeTypes.size === 0 || nodeTypes.has(node.type))
		.filter(
			(node) => !requirementHolds(nodeSubjectValue(node, requirement), requirement, ctx.regex),
		)
		.map((node) => ({
			message: messageFor(rule, workflow, node),
			params: { rule: rule.name, node: node.name },
			node,
			parameterPath: requirement.subject === 'parameter' ? requirement.path : undefined,
		}));
}
