import type { PackageResolver, PolicedType } from './policy-evaluator';
import type { PolicyRule, PolicySelector } from './policy-rule.types';
import { lintRulesForShadowing, type ShadowWarning } from './policy-shadow-lint';

/** `ruleId` names a package or type this instance has not loaded, so it matches nothing yet. */
export type NotInstalledWarning = {
	readonly kind: 'notInstalled';
	readonly ruleId: string;
};

export type PolicyRuleWarning = ShadowWarning | NotInstalledWarning;

/**
 * Warns instead of rejecting: a package can be uninstalled after its rule is saved, and the
 * rule must not block later, unrelated writes to the same policy.
 */
export function lintRulesForMissingTypes(
	rules: readonly PolicyRule[],
	isInstalled: (selector: PolicySelector) => boolean,
): NotInstalledWarning[] {
	return rules
		.filter((rule) => !isInstalled(rule.selector))
		.map((rule) => ({ kind: 'notInstalled', ruleId: rule.id }));
}

/**
 * Every warning for a rule list, in rule order. A rule with both kinds lists `shadowed` first,
 * since the sort is stable.
 */
export function lintPolicyRules(
	rules: readonly PolicyRule[],
	resolvers: {
		resolvePackage: PackageResolver;
		policedType: (name: string) => PolicedType;
		isInstalled: (selector: PolicySelector) => boolean;
	},
): PolicyRuleWarning[] {
	const position = new Map(rules.map((rule, index) => [rule.id, index]));
	const warnings: PolicyRuleWarning[] = [
		...lintRulesForShadowing(rules, resolvers.resolvePackage, resolvers.policedType),
		...lintRulesForMissingTypes(rules, resolvers.isInstalled),
	];

	return warnings.sort((a, b) => (position.get(a.ruleId) ?? 0) - (position.get(b.ruleId) ?? 0));
}
