import { getCatalogueRule } from './catalogue';
import { evaluateCustomRule } from './custom-rules';
import { projectCanExempt, type EffectiveRule } from './merge';
import { nativeRegexTester } from './regex';
import type {
	EvaluateOptions,
	RawFinding,
	RuleContext,
	RuleEvaluation,
	RuleEvaluationError,
	RuleFinding,
	RuleWorkflow,
} from './types';

function rawFindingsFor(
	rule: EffectiveRule,
	workflow: RuleWorkflow,
	ctx: RuleContext,
): RawFinding[] {
	if (rule.kind === 'custom') return evaluateCustomRule(workflow, rule.rule, ctx);
	return getCatalogueRule(rule.ruleId)?.evaluate(workflow, rule.options, ctx) ?? [];
}

/**
 * Runs the effective rules against one workflow. Pure and synchronous, so the editor,
 * the server and the CLI all get the same findings.
 *
 * A rule that throws is reported in `errors` and adds no finding.
 */
export function evaluateWorkflowRules(
	workflow: RuleWorkflow,
	rules: readonly EffectiveRule[],
	options: EvaluateOptions = {},
): RuleEvaluation {
	const ctx: RuleContext = {
		regex: options.regex ?? nativeRegexTester,
		defaults: options.defaults ?? {},
		getDefaultNodeName: options.getDefaultNodeName,
	};
	const exempted = new Set(options.exemptedRuleIds ?? []);
	const findings: RuleFinding[] = [];
	const errors: RuleEvaluationError[] = [];

	for (const rule of rules) {
		let raw: RawFinding[];
		try {
			raw = rawFindingsFor(rule, workflow, ctx);
		} catch (error) {
			errors.push({
				ruleId: rule.ruleId,
				message: error instanceof Error ? error.message : String(error),
			});
			continue;
		}
		for (const finding of raw) {
			findings.push({
				ruleId: rule.ruleId,
				ruleKind: rule.kind,
				scope: rule.scope,
				severity: rule.severity,
				message: finding.message,
				params: finding.params,
				nodeId: finding.node?.id,
				nodeName: finding.node?.name,
				parameterPath: finding.parameterPath,
				exempted: exempted.has(rule.ruleId),
				projectCanExempt: projectCanExempt(rule),
			});
		}
	}

	return { findings, errors };
}

/** Findings that stop a publish or an import. */
export function getBlockingFindings(findings: readonly RuleFinding[]): RuleFinding[] {
	return findings.filter((finding) => finding.severity === 'block' && !finding.exempted);
}
