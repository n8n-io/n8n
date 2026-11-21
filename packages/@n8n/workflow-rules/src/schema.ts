import { z } from 'zod';

import { getCatalogueRule } from './catalogue';
import { validateRegexPattern } from './regex';

export const RULE_SEVERITIES = ['off', 'warn', 'block'] as const;
export const ruleSeveritySchema = z.enum(RULE_SEVERITIES);

export const CUSTOM_RULE_ID_PATTERN = /^custom-[a-z0-9-]{1,60}$/;

export const NODE_SUBJECTS = [
	'parameter',
	'nodeName',
	'nodeType',
	'credentialType',
	'disabled',
	'retryOnFail',
] as const;
export const WORKFLOW_SUBJECTS = ['workflowName', 'description', 'setting', 'nodeCount'] as const;
export const SUBJECTS_WITH_PATH: ReadonlySet<string> = new Set(['parameter', 'setting']);

export const OPERATORS = [
	'isSet',
	'isNotSet',
	'equals',
	'notEquals',
	'oneOf',
	'notOneOf',
	'contains',
	'notContains',
	'matches',
	'notMatches',
	'lessThan',
	'greaterThan',
	'isExpression',
	'isNotExpression',
] as const;
export const OPERATORS_WITHOUT_VALUE: ReadonlySet<string> = new Set([
	'isSet',
	'isNotSet',
	'isExpression',
	'isNotExpression',
]);
const LIST_OPERATORS: ReadonlySet<string> = new Set(['oneOf', 'notOneOf']);
const NUMBER_OPERATORS: ReadonlySet<string> = new Set(['lessThan', 'greaterThan']);
const REGEX_OPERATORS: ReadonlySet<string> = new Set(['matches', 'notMatches']);

export const customRuleRequirementSchema = z.object({
	subject: z.enum([...NODE_SUBJECTS, ...WORKFLOW_SUBJECTS]),
	/** Dot path for the `parameter` and `setting` subjects, for example `options.timeout`. */
	path: z.string().trim().max(200).optional(),
	operator: z.enum(OPERATORS),
	value: z
		.union([z.string().max(1000), z.number(), z.boolean(), z.array(z.string().max(200)).max(200)])
		.optional(),
	flags: z.string().max(4).optional(),
});

export const customRuleTargetSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('workflow') }),
	z.object({
		kind: z.literal('nodes'),
		/** Empty means every node. */
		nodeTypes: z.array(z.string().max(200)).max(100).default([]),
	}),
]);

export const customRuleSchema = z
	.object({
		id: z.string().regex(CUSTOM_RULE_ID_PATTERN),
		name: z.string().trim().min(1).max(80),
		description: z.string().max(500).optional(),
		severity: ruleSeveritySchema,
		adjustable: z.boolean().optional(),
		target: customRuleTargetSchema,
		require: customRuleRequirementSchema,
		/** Shown to builders. `{node}` and `{workflow}` are replaced. */
		message: z.string().max(300).optional(),
	})
	.superRefine((rule, ctx) => {
		const issue = (message: string, path: Array<string | number>) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
		const { subject, operator, value, path, flags } = rule.require;
		const isNodeSubject = (NODE_SUBJECTS as readonly string[]).includes(subject);

		if (isNodeSubject !== (rule.target.kind === 'nodes')) {
			issue('This subject does not apply to this target', ['require', 'subject']);
		}
		if (SUBJECTS_WITH_PATH.has(subject) && !path) {
			issue('Enter a path', ['require', 'path']);
		}
		if (OPERATORS_WITHOUT_VALUE.has(operator)) return;
		if (value === undefined || value === '') {
			issue('Enter a value', ['require', 'value']);
		} else if (LIST_OPERATORS.has(operator) && !Array.isArray(value)) {
			issue('Enter a list of values', ['require', 'value']);
		} else if (NUMBER_OPERATORS.has(operator) && typeof value !== 'number') {
			issue('Enter a number', ['require', 'value']);
		} else if (REGEX_OPERATORS.has(operator)) {
			const error =
				typeof value === 'string' ? validateRegexPattern(value, flags) : 'Enter a pattern';
			if (error) issue(error, ['require', 'value']);
		}
	});

export const catalogueRuleSettingSchema = z.object({
	/** A catalogue rule id. In a project rule set it may also name an instance custom rule. */
	ruleId: z.string().min(1).max(80),
	severity: ruleSeveritySchema,
	options: z.record(z.unknown()).optional(),
	/** Instance only: projects may lower or turn off this rule. */
	adjustable: z.boolean().optional(),
});

export const ruleSetSchema = z
	.object({
		rules: z.array(catalogueRuleSettingSchema).max(100).default([]),
		customRules: z.array(customRuleSchema).max(100).default([]),
	})
	.superRefine((ruleSet, ctx) => {
		const seen = new Set<string>();
		ruleSet.rules.forEach((setting, index) => {
			const path = ['rules', index];
			if (seen.has(setting.ruleId)) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate rule', path });
			}
			seen.add(setting.ruleId);

			const catalogueRule = getCatalogueRule(setting.ruleId);
			if (!catalogueRule) {
				if (!CUSTOM_RULE_ID_PATTERN.test(setting.ruleId)) {
					ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unknown rule', path });
				}
				return;
			}
			if (setting.severity === 'off') return;
			const error = catalogueRule.validateOptions(setting.options);
			if (error) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: error, path: [...path, 'options'] });
			}
		});
		ruleSet.customRules.forEach((rule, index) => {
			if (seen.has(rule.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Duplicate rule',
					path: ['customRules', index, 'id'],
				});
			}
			seen.add(rule.id);
		});
	});

export const ruleDefaultsSchema = z.object({
	callerPolicy: z.string().optional(),
	executionTimeout: z.number().optional(),
	maxExecutionTimeout: z.number().optional(),
});

export const ruleExemptionRefSchema = z.object({
	workflowId: z.string().min(1),
	ruleId: z.string().min(1).max(80),
});

/** What `n8n-cli workflow-rules export` writes and `check --rules` reads. */
export const rulesExportBundleSchema = z.object({
	version: z.literal(1),
	exportedAt: z.string(),
	defaults: ruleDefaultsSchema.default({}),
	instance: ruleSetSchema,
	projects: z
		.array(
			z.object({
				projectId: z.string(),
				projectName: z.string().optional(),
				ruleSet: ruleSetSchema,
			}),
		)
		.default([]),
	exemptions: z.array(ruleExemptionRefSchema).default([]),
});

export type RuleSetInput = z.input<typeof ruleSetSchema>;
export type RuleSet = z.output<typeof ruleSetSchema>;
export type CatalogueRuleSetting = z.output<typeof catalogueRuleSettingSchema>;
export type CustomRule = z.output<typeof customRuleSchema>;
export type CustomRuleRequirement = z.output<typeof customRuleRequirementSchema>;
export type CustomRuleTarget = z.output<typeof customRuleTargetSchema>;
export type CustomRuleSubject = CustomRuleRequirement['subject'];
export type CustomRuleOperator = CustomRuleRequirement['operator'];
export type RuleExemptionRef = z.output<typeof ruleExemptionRefSchema>;
export type RulesExportBundle = z.output<typeof rulesExportBundleSchema>;

export const EMPTY_RULE_SET: RuleSet = { rules: [], customRules: [] };
