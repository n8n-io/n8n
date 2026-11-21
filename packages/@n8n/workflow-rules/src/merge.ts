import { getCatalogueRule } from './catalogue';
import type { CatalogueRuleSetting, CustomRule, RuleSet } from './schema';
import type { FindingSeverity, RuleScope, RuleSeverity } from './types';

interface EffectiveRuleBase {
	readonly ruleId: string;
	readonly severity: FindingSeverity;
	/** Which rule set the rule comes from. A rule the instance defines stays `instance` even when a project adjusts it. */
	readonly scope: RuleScope;
	/** The instance admin lets projects lower or turn off this rule. */
	readonly adjustable: boolean;
	/** A project changed this instance rule. */
	readonly adjustedByProject: boolean;
}

export interface EffectiveCatalogueRule extends EffectiveRuleBase {
	readonly kind: 'catalogue';
	readonly options: unknown;
}

export interface EffectiveCustomRule extends EffectiveRuleBase {
	readonly kind: 'custom';
	readonly rule: CustomRule;
}

export type EffectiveRule = EffectiveCatalogueRule | EffectiveCustomRule;

const SEVERITY_RANK: Record<RuleSeverity, number> = { off: 0, warn: 1, block: 2 };

export function stricterSeverity(a: RuleSeverity, b: RuleSeverity): RuleSeverity {
	return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function isActive(severity: RuleSeverity): severity is FindingSeverity {
	return severity !== 'off';
}

/** Project admins may exempt a workflow from a project rule, or from an instance rule marked adjustable. */
export function projectCanExempt(rule: Pick<EffectiveRule, 'scope' | 'adjustable'>): boolean {
	return rule.scope === 'project' || rule.adjustable;
}

function mergeCatalogueRule(
	instance: CatalogueRuleSetting | undefined,
	project: CatalogueRuleSetting | undefined,
): EffectiveCatalogueRule | undefined {
	const ruleId = instance?.ruleId ?? project?.ruleId;
	const catalogueRule = ruleId ? getCatalogueRule(ruleId) : undefined;
	if (!ruleId || !catalogueRule) return undefined;

	if (instance && project) {
		if (instance.adjustable) {
			if (!isActive(project.severity)) return undefined;
			return {
				kind: 'catalogue',
				ruleId,
				severity: project.severity,
				options: project.options ?? instance.options,
				scope: 'instance',
				adjustable: true,
				adjustedByProject: true,
			};
		}

		const severity = stricterSeverity(instance.severity, project.severity);
		if (!isActive(severity)) return undefined;
		const bothActive = isActive(instance.severity) && isActive(project.severity);
		return {
			kind: 'catalogue',
			ruleId,
			severity,
			options: bothActive
				? catalogueRule.tighten(instance.options, project.options)
				: isActive(instance.severity)
					? instance.options
					: project.options,
			scope: isActive(instance.severity) ? 'instance' : 'project',
			adjustable: false,
			adjustedByProject: bothActive && severity !== instance.severity,
		};
	}

	const only = instance ?? project;
	if (!only || !isActive(only.severity)) return undefined;
	return {
		kind: 'catalogue',
		ruleId,
		severity: only.severity,
		options: only.options,
		scope: instance ? 'instance' : 'project',
		adjustable: instance ? (instance.adjustable ?? false) : false,
		adjustedByProject: false,
	};
}

/**
 * Combines the instance rule set with a project rule set.
 *
 * A project can make any instance rule stricter. It can lower or turn off an instance
 * rule only when the instance admin marked that rule adjustable.
 */
export function resolveEffectiveRules(
	instanceSet: RuleSet | undefined,
	projectSet?: RuleSet,
): EffectiveRule[] {
	const instanceRules = new Map((instanceSet?.rules ?? []).map((rule) => [rule.ruleId, rule]));
	const projectRules = new Map((projectSet?.rules ?? []).map((rule) => [rule.ruleId, rule]));
	const effective: EffectiveRule[] = [];

	const catalogueIds = new Set(
		[...instanceRules.keys(), ...projectRules.keys()].filter((id) => getCatalogueRule(id)),
	);
	for (const ruleId of catalogueIds) {
		const merged = mergeCatalogueRule(instanceRules.get(ruleId), projectRules.get(ruleId));
		if (merged) effective.push(merged);
	}

	for (const rule of instanceSet?.customRules ?? []) {
		const override = projectRules.get(rule.id);
		const adjustable = rule.adjustable ?? false;
		const severity = override
			? adjustable
				? override.severity
				: stricterSeverity(rule.severity, override.severity)
			: rule.severity;
		if (!isActive(severity)) continue;
		effective.push({
			kind: 'custom',
			ruleId: rule.id,
			rule,
			severity,
			scope: 'instance',
			adjustable,
			adjustedByProject: override !== undefined && severity !== rule.severity,
		});
	}

	for (const rule of projectSet?.customRules ?? []) {
		if (!isActive(rule.severity)) continue;
		effective.push({
			kind: 'custom',
			ruleId: rule.id,
			rule,
			severity: rule.severity,
			scope: 'project',
			adjustable: false,
			adjustedByProject: false,
		});
	}

	return effective;
}
